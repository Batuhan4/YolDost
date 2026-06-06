#!/usr/bin/env python3
"""Prepare a KVKK-safe, open-license street-image demo set locally."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from datasets import load_dataset
from huggingface_hub import hf_hub_download
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_OUTPUT = ROOT / "data" / "interim" / "anonymized"
DEFAULT_MANIFEST = ROOT / "reports" / "data-manifest.json"

DATASET_ID = "Reubencf/streetview-global"
DATASET_REVISION = "a206537534dc0e8165e0e7d36f08df14795127db"
DATASET_LICENSE = "CC-BY-SA-4.0"
FACE_MODEL_ID = "arnabdhar/YOLOv8-Face-Detection"
FACE_MODEL_REVISION = "52fa54977207fa4f021de949b515fb19dcab4488"
PLATE_MODEL_ID = "Koushim/yolov8-license-plate-detection"
PLATE_MODEL_REVISION = "9aaa5cd490abe0c165882ba87f4f62658ab54d01"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--face-threshold", type=float, default=0.15)
    parser.add_argument("--plate-threshold", type=float, default=0.15)
    return parser.parse_args()


def model_path(repo_id: str, filename: str, revision: str) -> str:
    return hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        revision=revision,
        token=os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY"),
        local_dir=ROOT / "models" / repo_id.replace("/", "--"),
    )


def expanded_box(box: list[float], width: int, height: int) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    pad_x = (x2 - x1) * 0.20
    pad_y = (y2 - y1) * 0.20
    return (
        max(0, int(x1 - pad_x)),
        max(0, int(y1 - pad_y)),
        min(width, int(x2 + pad_x)),
        min(height, int(y2 + pad_y)),
    )


def mask_regions(
    image: np.ndarray, model: YOLO, threshold: float
) -> tuple[np.ndarray, int]:
    result = model.predict(image, conf=threshold, verbose=False)[0]
    boxes = result.boxes.xyxy.cpu().tolist() if result.boxes is not None else []
    masked = image.copy()
    height, width = masked.shape[:2]
    for box in boxes:
        x1, y1, x2, y2 = expanded_box(box, width, height)
        if x2 > x1 and y2 > y1:
            masked[y1:y2, x1:x2] = 0
    return masked, len(boxes)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_record(example: dict[str, Any], filename: str, faces: int, plates: int, digest: str) -> dict[str, Any]:
    return {
        "source_id": str(example["id"]),
        "region": example.get("region"),
        "setting": example.get("setting"),
        "weather": example.get("weather"),
        "time_of_day": example.get("time_of_day"),
        "road_type": example.get("road_type"),
        "latitude": example.get("latitude"),
        "longitude": example.get("longitude"),
        "captured_at": example.get("captured_at"),
        "anonymized_file": filename,
        "anonymized_sha256": digest,
        "faces_masked": faces,
        "plates_masked": plates,
        "mask_method": "solid_mask",
    }


def main() -> int:
    args = parse_args()
    if args.count < 1:
        raise SystemExit("--count must be positive")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)

    face_model = YOLO(model_path(FACE_MODEL_ID, "model.pt", FACE_MODEL_REVISION))
    plate_model = YOLO(model_path(PLATE_MODEL_ID, "best.pt", PLATE_MODEL_REVISION))

    dataset = load_dataset(
        DATASET_ID,
        split="train",
        revision=DATASET_REVISION,
        streaming=True,
    ).shuffle(seed=args.seed, buffer_size=500)

    records: list[dict[str, Any]] = []
    iterator = iter(dataset)
    try:
        for example in iterator:
            if example.get("setting") not in {"urban", "suburban"}:
                continue
            if example.get("time_of_day") != "day":
                continue

            rgb = np.asarray(example["image"].convert("RGB"))
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            anonymized, faces = mask_regions(bgr, face_model, args.face_threshold)
            anonymized, plates = mask_regions(
                anonymized, plate_model, args.plate_threshold
            )

            filename = f"street-{len(records) + 1:03d}.jpg"
            output = args.output_dir / filename
            if not cv2.imwrite(str(output), anonymized, [cv2.IMWRITE_JPEG_QUALITY, 90]):
                raise RuntimeError(f"failed to write anonymized image: {output}")
            records.append(safe_record(example, filename, faces, plates, sha256(output)))
            if len(records) >= args.count:
                break
    except Exception:
        shutil.rmtree(args.output_dir, ignore_errors=True)
        raise
    finally:
        close = getattr(iterator, "close", None)
        if callable(close):
            close()
        del iterator
        del dataset
        gc.collect()

    if len(records) != args.count:
        raise RuntimeError(f"requested {args.count} samples, prepared {len(records)}")

    manifest = {
        "dataset": {
            "id": DATASET_ID,
            "revision": DATASET_REVISION,
            "license": DATASET_LICENSE,
            "source": "Mapillary contributors via Hugging Face",
            "selection": {
                "setting": ["urban", "suburban"],
                "time_of_day": ["day"],
                "seed": args.seed,
            },
        },
        "anonymization": {
            "method": "solid_mask",
            "padding_ratio": 0.20,
            "face_model": {
                "id": FACE_MODEL_ID,
                "revision": FACE_MODEL_REVISION,
                "threshold": args.face_threshold,
            },
            "plate_model": {
                "id": PLATE_MODEL_ID,
                "revision": PLATE_MODEL_REVISION,
                "threshold": args.plate_threshold,
            },
            "faces_masked": sum(item["faces_masked"] for item in records),
            "plates_masked": sum(item["plates_masked"] for item in records),
        },
        "sample_count": len(records),
        "records": records,
        "privacy_note": (
            "Only anonymized derivatives remain. Raw streamed images were held "
            "in process memory and were not written to disk."
        ),
    }
    args.manifest.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    print(
        f"[prepare] {len(records)} anonymized images; "
        f"{manifest['anonymization']['faces_masked']} faces and "
        f"{manifest['anonymization']['plates_masked']} plates masked"
    )
    print(f"[prepare] manifest: {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
