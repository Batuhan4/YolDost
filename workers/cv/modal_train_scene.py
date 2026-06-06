#!/usr/bin/env python3
"""Train an anonymized urban/suburban context head on Modal GPU.

This auxiliary model provides a measurable training/evaluation artifact for the
hackathon. Its labels come from model-generated dataset annotations, so the
reported metric is weak-label agreement, not ground-truth street-analysis
accuracy.
"""

from __future__ import annotations

import json
import hashlib
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent.parent
LOCAL_IMAGES = ROOT / "data" / "interim" / "anonymized"
LOCAL_MANIFEST = ROOT / "reports" / "data-manifest.json"
REMOTE_DATA = Path("/omnisight-data")
BASE_MODEL = "google/vit-base-patch16-224-in21k"
BASE_MODEL_REVISION = "b4569560a39a0f1af58e3ddaf17facf20ab919b0"
SEED = 42

image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "torch",
        "torchvision",
        "transformers==4.57.3",
        "pillow",
        "numpy",
    )
    .add_local_dir(LOCAL_IMAGES, remote_path=str(REMOTE_DATA / "images"), copy=True)
    .add_local_file(
        LOCAL_MANIFEST,
        remote_path=str(REMOTE_DATA / "data-manifest.json"),
        copy=True,
    )
)

app = modal.App("omnisight-scene-training", image=image)
checkpoint_volume = modal.Volume.from_name(
    "omnisight-training-checkpoints",
    create_if_missing=True,
)
CHECKPOINT_ROOT = Path("/omnisight-checkpoints")


@app.function(
    gpu=["B200", "H200", "H100"],
    timeout=30 * 60,
    cpu=4,
    memory=16384,
    volumes={CHECKPOINT_ROOT: checkpoint_volume},
)
def train(epochs: int = 5, batch_size: int = 8, learning_rate: float = 3e-4) -> dict:
    import random
    import time
    import copy

    import numpy as np
    import torch
    from PIL import Image
    from torch.utils.data import DataLoader, Dataset
    from transformers import AutoImageProcessor, ViTForImageClassification

    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.cuda.manual_seed_all(SEED)

    manifest = json.loads(
        (REMOTE_DATA / "data-manifest.json").read_text(encoding="utf-8")
    )
    labels = {"suburban": 0, "urban": 1}
    rows = [
        record
        for record in manifest["records"]
        if record.get("setting") in labels
    ]

    by_label: dict[int, list[dict]] = {0: [], 1: []}
    for row in rows:
        by_label[labels[row["setting"]]].append(row)
    for values in by_label.values():
        random.shuffle(values)

    balanced_count = min(len(values) for values in by_label.values())
    train_rows: list[dict] = []
    val_rows: list[dict] = []
    for values in by_label.values():
        balanced = values[:balanced_count]
        split = max(1, int(len(balanced) * 0.8))
        train_rows.extend(balanced[:split])
        val_rows.extend(balanced[split:])
    random.shuffle(train_rows)
    random.shuffle(val_rows)

    if not train_rows or not val_rows or len(by_label[0]) < 2 or len(by_label[1]) < 2:
        raise RuntimeError("both labels need at least two samples")

    processor = AutoImageProcessor.from_pretrained(
        BASE_MODEL, revision=BASE_MODEL_REVISION
    )

    class StreetDataset(Dataset):
        def __init__(self, records: list[dict]) -> None:
            self.records = records

        def __len__(self) -> int:
            return len(self.records)

        def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
            record = self.records[index]
            pil = Image.open(
                REMOTE_DATA / "images" / record["anonymized_file"]
            ).convert("RGB")
            tensor = processor(images=pil, return_tensors="pt")["pixel_values"][0]
            return tensor, torch.tensor(labels[record["setting"]], dtype=torch.long)

    train_loader = DataLoader(
        StreetDataset(train_rows),
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
    )
    val_loader = DataLoader(
        StreetDataset(val_rows),
        batch_size=batch_size,
        shuffle=False,
        num_workers=2,
        pin_memory=True,
    )

    model, loading_info = ViTForImageClassification.from_pretrained(
        BASE_MODEL,
        revision=BASE_MODEL_REVISION,
        num_labels=2,
        id2label={0: "suburban", 1: "urban"},
        label2id={"suburban": 0, "urban": 1},
        ignore_mismatched_sizes=True,
        output_loading_info=True,
    )
    invalid_missing = [
        key
        for key in loading_info["missing_keys"]
        if not key.startswith("classifier.")
    ]
    if invalid_missing:
        raise RuntimeError(
            "base checkpoint did not load into the ViT backbone: "
            + ", ".join(invalid_missing[:5])
        )
    for parameter in model.vit.parameters():
        parameter.requires_grad = False

    device = torch.device("cuda")
    model.to(device)
    optimizer = torch.optim.AdamW(
        model.classifier.parameters(),
        lr=learning_rate,
        weight_decay=0.01,
    )

    epoch_rows: list[dict] = []
    best_accuracy = -1.0
    best_epoch = 0
    best_predictions: list[int] = []
    best_targets: list[int] = []
    best_classifier_state: dict = {}
    start = time.perf_counter()
    for epoch in range(epochs):
        model.train()
        losses: list[float] = []
        for pixels, target in train_loader:
            pixels = pixels.to(device, non_blocking=True)
            target = target.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            output = model(pixel_values=pixels, labels=target)
            output.loss.backward()
            optimizer.step()
            losses.append(float(output.loss.detach().cpu()))

        model.eval()
        predictions: list[int] = []
        targets: list[int] = []
        with torch.inference_mode():
            for pixels, target in val_loader:
                logits = model(pixel_values=pixels.to(device)).logits
                predictions.extend(logits.argmax(dim=1).cpu().tolist())
                targets.extend(target.tolist())

        accuracy = sum(p == t for p, t in zip(predictions, targets)) / len(targets)
        if accuracy > best_accuracy:
            best_accuracy = accuracy
            best_epoch = epoch + 1
            best_predictions = predictions.copy()
            best_targets = targets.copy()
            best_classifier_state = copy.deepcopy(
                model.classifier.state_dict()
            )
        epoch_rows.append(
            {
                "epoch": epoch + 1,
                "train_loss": round(sum(losses) / len(losses), 6),
                "validation_accuracy": round(accuracy, 6),
            }
        )

    duration = time.perf_counter() - start
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ-modal-scene")
    checkpoint_dir = CHECKPOINT_ROOT / run_id
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = checkpoint_dir / "classifier-head.pt"
    torch.save(
        {
            "base_model": BASE_MODEL,
            "base_model_revision": BASE_MODEL_REVISION,
            "labels": {"suburban": 0, "urban": 1},
            "best_epoch": best_epoch,
            "classifier_state_dict": best_classifier_state,
        },
        checkpoint_path,
    )
    checkpoint_digest = hashlib.sha256(checkpoint_path.read_bytes()).hexdigest()
    checkpoint_volume.commit()

    confusion = [[0, 0], [0, 0]]
    for target, prediction in zip(best_targets, best_predictions):
        confusion[target][prediction] += 1

    per_class = {}
    for label_id, label_name in ((0, "suburban"), (1, "urban")):
        tp = confusion[label_id][label_id]
        fp = sum(confusion[row][label_id] for row in range(2)) - tp
        fn = sum(confusion[label_id]) - tp
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall
            else 0.0
        )
        per_class[label_name] = {
            "precision": round(precision, 6),
            "recall": round(recall, 6),
            "f1": round(f1, 6),
        }

    return {
        "run_id": run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "task": "urban_suburban_scene_context",
        "metric_scope": "agreement with model-generated weak labels",
        "dataset": manifest["dataset"],
        "anonymization": manifest["anonymization"],
        "base_model": {"id": BASE_MODEL, "revision": BASE_MODEL_REVISION},
        "gpu": torch.cuda.get_device_name(0),
        "seed": SEED,
        "hyperparameters": {
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "optimizer": "AdamW",
            "weight_decay": 0.01,
            "frozen_backbone": True,
        },
        "split": {
            "train_count": len(train_rows),
            "validation_count": len(val_rows),
            "train_labels": dict(Counter(row["setting"] for row in train_rows)),
            "validation_labels": dict(
                Counter(row["setting"] for row in val_rows)
            ),
        },
        "training_seconds": round(duration, 6),
        "epochs": epoch_rows,
        "validation": {
            "best_epoch": best_epoch,
            "accuracy": round(best_accuracy, 6),
            "confusion_matrix": confusion,
            "labels": ["suburban", "urban"],
            "per_class": per_class,
            "macro_f1": round(
                sum(item["f1"] for item in per_class.values()) / 2, 6
            ),
        },
        "checkpoint": {
            "storage": "private_modal_volume",
            "volume": "omnisight-training-checkpoints",
            "path": str(checkpoint_path),
            "sha256": checkpoint_digest,
        },
        "limitations": [
            "Dataset setting labels were generated by a vision-language model and are weak labels.",
            "This metric is not SegFormer mIoU and not pedestrian-density accuracy.",
            "The classifier is an auxiliary context model; physical street metrics remain the product core.",
        ],
    }


def report_markdown(result: dict) -> str:
    validation = result["validation"]
    lines = [
        f"# Modal Training Run: {result['run_id']}",
        "",
        "## Scope",
        "",
        "Auxiliary urban/suburban scene-context classifier trained only on locally",
        "anonymized Hugging Face/Mapillary derivatives.",
        "",
        f"- GPU: `{result['gpu']}`",
        f"- Base model: `{result['base_model']['id']}` @ `{result['base_model']['revision']}`",
        f"- Training samples: {result['split']['train_count']}",
        f"- Validation samples: {result['split']['validation_count']}",
        f"- Training time: {result['training_seconds']:.3f} seconds",
        f"- Validation agreement: {validation['accuracy'] * 100:.2f}%",
        f"- Macro F1: {validation['macro_f1']:.4f}",
        f"- Best epoch: {validation['best_epoch']}",
        f"- Checkpoint: `{result['checkpoint']['volume']}{result['checkpoint']['path']}`",
        f"- Checkpoint SHA-256: `{result['checkpoint']['sha256']}`",
        "",
        "## Hyperparameters",
        "",
        "```json",
        json.dumps(result["hyperparameters"], indent=2),
        "```",
        "",
        "## Epochs",
        "",
        "| Epoch | Train loss | Validation agreement |",
        "|---:|---:|---:|",
    ]
    for epoch in result["epochs"]:
        lines.append(
            f"| {epoch['epoch']} | {epoch['train_loss']:.6f} | "
            f"{epoch['validation_accuracy'] * 100:.2f}% |"
        )
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "This is agreement with model-generated weak scene labels. It is not",
            "ground-truth street-analysis accuracy, SegFormer mIoU, person-density",
            "accuracy, crime prediction, or a safety guarantee.",
            "",
            "## Limitations",
            "",
        ]
    )
    lines.extend(f"- {item}" for item in result["limitations"])
    lines.append("")
    return "\n".join(lines)


@app.local_entrypoint()
def main(epochs: int = 5, batch_size: int = 8, learning_rate: float = 3e-4) -> None:
    result = train.remote(epochs, batch_size, learning_rate)
    run_dir = ROOT / "reports" / "runs" / result["run_id"]
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "metrics.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    (run_dir / "report.md").write_text(
        report_markdown(result),
        encoding="utf-8",
    )
    print(f"[modal-train] report: {run_dir / 'report.md'}")
