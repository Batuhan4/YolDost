#!/usr/bin/env python3
"""Run semantic street analysis and write reproducible Markdown/JSON reports."""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_INPUT = ROOT / "data" / "interim" / "anonymized"
DEFAULT_MANIFEST = ROOT / "reports" / "data-manifest.json"
MODEL_ID = "nvidia/segformer-b0-finetuned-cityscapes-1024-1024"
MODEL_REVISION = "21b3847fae21ddee674abd31129307b6a1235bd9"
ALLOWED_PHYSICAL_CLASSES = {
    "road",
    "sidewalk",
    "building",
    "wall",
    "fence",
    "pole",
    "traffic light",
    "traffic sign",
    "vegetation",
    "terrain",
    "sky",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--run-id", default=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ-baseline"))
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    return parser.parse_args()


def score(share: float, target: float) -> float:
    return round(min(share / target, 1.0) * 100.0, 2)


def physical_metrics(shares: dict[str, float]) -> dict[str, float]:
    built_share = sum(shares.get(name, 0.0) for name in ("building", "wall", "fence"))
    green_share = shares.get("vegetation", 0.0) + shares.get("terrain", 0.0)
    openness = score(shares.get("sky", 0.0), 0.30)
    sidewalk = score(shares.get("sidewalk", 0.0), 0.20)
    greenery = score(green_share, 0.30)
    built_density = round(built_share * 100.0, 2)
    comfort = round(
        0.35 * openness
        + 0.35 * sidewalk
        + 0.20 * greenery
        + 0.10 * max(0.0, 100.0 - built_density),
        2,
    )
    return {
        "built_density_pct": built_density,
        "openness_score": openness,
        "sidewalk_availability_score": sidewalk,
        "greenery_score": greenery,
        "road_share_pct": round(shares.get("road", 0.0) * 100.0, 2),
        "pedestrian_comfort_potential": comfort,
    }


def resolve_device(requested: str) -> torch.device:
    if requested == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA requested but unavailable")
        return torch.device("cuda")
    if requested == "cpu":
        return torch.device("cpu")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def aggregate(rows: list[dict[str, Any]], key: str) -> float:
    return round(statistics.fmean(row["metrics"][key] for row in rows), 2)


def write_report(run_dir: Path, payload: dict[str, Any]) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "metrics.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )

    benchmark = payload["benchmark"]
    summary = payload["summary"]
    lines = [
        f"# Street Analysis Run: {payload['run_id']}",
        "",
        "## Evidence",
        "",
        f"- Dataset: `{payload['dataset']['id']}` @ `{payload['dataset']['revision']}`",
        f"- Dataset license: `{payload['dataset']['license']}`",
        f"- Model: `{payload['model']['id']}` @ `{payload['model']['revision']}`",
        f"- Device: `{benchmark['device']}`",
        f"- Images: {benchmark['image_count']}",
        f"- Total inference time: {benchmark['inference_seconds']:.3f} seconds",
        f"- Throughput: {benchmark['images_per_second']:.3f} images/second",
        "",
        "## Aggregate Physical Indicators",
        "",
        "| Indicator | Mean |",
        "|---|---:|",
        f"| Built density | {summary['built_density_pct']:.2f}% |",
        f"| Openness score | {summary['openness_score']:.2f}/100 |",
        f"| Sidewalk availability proxy | {summary['sidewalk_availability_score']:.2f}/100 |",
        f"| Greenery score | {summary['greenery_score']:.2f}/100 |",
        f"| Road share | {summary['road_share_pct']:.2f}% |",
        f"| Pedestrian comfort potential | {summary['pedestrian_comfort_potential']:.2f}/100 |",
        "",
        "## Accuracy Status",
        "",
        "**Segmentation accuracy is not measured in this run.** The open demo images",
        "do not contain matching pixel-level ground truth. Throughput and class",
        "coverage are benchmark results, not accuracy. Accuracy metrics such as",
        "mIoU must only be reported after evaluating against a labeled validation set.",
        "",
        "## Score Formula",
        "",
        "- Built density: building + wall + fence pixel share.",
        "- Openness: sky share normalized to a 30% reference.",
        "- Sidewalk availability: sidewalk share normalized to a 20% reference.",
        "- Greenery: vegetation + terrain share normalized to a 30% reference.",
        "- Comfort potential: 35% openness + 35% sidewalk + 20% greenery +",
        "  10% inverse built density.",
        "",
        "These values are transparent planning proxies. They do not measure people,",
        "crime, guaranteed safety, mental state, revenue, or live pedestrian traffic.",
        "Person, rider, and vehicle model classes are discarded before persistence.",
        "",
        "## Anonymization",
        "",
        f"- Faces masked: {payload['anonymization']['faces_masked']}",
        f"- Plates masked: {payload['anonymization']['plates_masked']}",
        f"- Method: `{payload['anonymization']['method']}`",
        "- Raw streamed images were not written to disk.",
        "",
        "## Per-Image Results",
        "",
        "| Image | Built % | Open | Sidewalk | Green | Comfort |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for row in payload["images"]:
        metrics = row["metrics"]
        lines.append(
            f"| `{row['image']}` | {metrics['built_density_pct']:.2f} | "
            f"{metrics['openness_score']:.2f} | "
            f"{metrics['sidewalk_availability_score']:.2f} | "
            f"{metrics['greenery_score']:.2f} | "
            f"{metrics['pedestrian_comfort_potential']:.2f} |"
        )
    lines.append("")
    (run_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    device = resolve_device(args.device)

    processor = AutoImageProcessor.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
    model = SegformerForSemanticSegmentation.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION
    ).to(device)
    model.eval()

    rows: list[dict[str, Any]] = []
    durations: list[float] = []
    labels_seen: Counter[str] = Counter()

    for record in manifest["records"]:
        path = args.input_dir / record["anonymized_file"]
        image = Image.open(path).convert("RGB")
        inputs = processor(images=image, return_tensors="pt").to(device)

        start = time.perf_counter()
        with torch.inference_mode():
            logits = model(**inputs).logits
            prediction = torch.nn.functional.interpolate(
                logits,
                size=(image.height, image.width),
                mode="bilinear",
                align_corners=False,
            ).argmax(dim=1)[0]
        if device.type == "cuda":
            torch.cuda.synchronize()
        durations.append(time.perf_counter() - start)

        counts = Counter(prediction.cpu().numpy().ravel().tolist())
        total = prediction.numel()
        shares = {
            model.config.id2label[int(label)]: count / total
            for label, count in counts.items()
            if model.config.id2label[int(label)] in ALLOWED_PHYSICAL_CLASSES
        }
        labels_seen.update(shares.keys())
        rows.append(
            {
                "image": record["anonymized_file"],
                "source_id": record["source_id"],
                "region": record.get("region"),
                "class_shares": {k: round(v, 6) for k, v in sorted(shares.items())},
                "metrics": physical_metrics(shares),
                "inference_seconds": round(durations[-1], 6),
            }
        )

    inference_seconds = sum(durations)
    payload = {
        "run_id": args.run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "dataset": manifest["dataset"],
        "anonymization": manifest["anonymization"],
        "model": {"id": MODEL_ID, "revision": MODEL_REVISION},
        "runtime": {
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": __import__("transformers").__version__,
        },
        "benchmark": {
            "device": str(device),
            "gpu_name": torch.cuda.get_device_name(0) if device.type == "cuda" else None,
            "image_count": len(rows),
            "inference_seconds": round(inference_seconds, 6),
            "images_per_second": round(len(rows) / inference_seconds, 6),
            "classes_observed": sorted(labels_seen),
        },
        "accuracy": {
            "status": "not_measured",
            "reason": "demo dataset has no matching pixel-level ground truth",
            "metrics": {},
        },
        "summary": {
            key: aggregate(rows, key)
            for key in (
                "built_density_pct",
                "openness_score",
                "sidewalk_availability_score",
                "greenery_score",
                "road_share_pct",
                "pedestrian_comfort_potential",
            )
        },
        "images": rows,
    }
    run_dir = ROOT / "reports" / "runs" / args.run_id
    write_report(run_dir, payload)
    print(f"[analyze] report: {run_dir / 'report.md'}")
    print(
        f"[analyze] {len(rows)} images, {payload['benchmark']['images_per_second']:.3f} img/s, "
        f"comfort mean {payload['summary']['pedestrian_comfort_potential']:.2f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
