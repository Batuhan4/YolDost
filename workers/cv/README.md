# CV Worker — Anonymization Gate + Urban Object Detection

Python worker that turns street imagery into KVKK-safe detection metadata.

## Pipeline order (non-negotiable)

1. **Anonymization first.** Faces and license plates are located and
   irreversibly masked (gaussian blur / solid mask). This is a *gate*: nothing
   else may touch the image before it.
2. **Object detection second.** Urban object detection (signs, bins, poles,
   benches, potholes, …) runs **only** on the anonymized derivative.
3. **Metadata out.** Detection results + anonymization audit counts are
   written as JSON aligned with `packages/contracts`.

## What this worker will never do

- ❌ No face recognition — the face detector exists ONLY to find regions to mask.
- ❌ No license plate OCR / reading — the plate detector exists ONLY to find regions to mask.
- ❌ No identity detection, person profiling, or person/vehicle tracking.
- ❌ No storing of raw regions, crops, embeddings or plate text — the
  anonymization audit record contains counts only.

## Models (Hugging Face — see docs/ai-usage.md)

| Purpose | Model | Note |
| --- | --- | --- |
| Face anonymization | `arnabdhar/YOLOv8-Face-Detection` | local cache: `models/yolov8_face.pt` |
| Plate anonymization | `Koushim/yolov8-license-plate-detection` | local cache: `models/yolov8_plate.pt` |
| Urban objects (default) | `shirabendor/YOLOV8-oiv7` | 601 OIV7 classes incl. waste container, street light, bench |
| Road damage | `rezzzq/yolo12s-road-damage-rdd2022` | D00–D40 + pothole classes |

Weights are downloaded from Hugging Face into `models/` (gitignored cache).

## Run

```bash
# Placeholder mode — stdlib only, deterministic, no imagery involved:
python3 workers/cv/run_demo.py \
  --input data/fixtures/demo-input.json \
  --output data/processed/demo-result.json

# Same thing via the repeatability-checked script:
scripts/demo-fixture.sh

# Prepare open-license Hugging Face / Mapillary samples.
# Raw images stay in memory; only solid-masked derivatives are written locally.
set -a; . ./.env; set +a
.venv/bin/python workers/cv/prepare_hf_demo.py --count 12

# Run semantic street analysis and generate reports/runs/<run-id>/.
.venv/bin/python workers/cv/analyze_streets.py --device auto
```

Real-imagery mode requires `requirements.txt` installed **and** the
anonymization pipeline wired; until then the worker refuses real images
(KVKK-safe default). It will never process raw imagery without the gate.

The semantic analysis tool uses only physical Cityscapes classes: road,
sidewalk, building, wall, fence, pole, traffic light/sign, vegetation, terrain,
and sky. Person, rider, and vehicle classes are discarded before persistence.
Its physical scores are transparent planning proxies, not people density,
crime, guaranteed safety, or revenue predictions.
