# AI Usage

How AI is used to build and to power this project. The product's AI core is
**computer vision via Hugging Face** — there is no Gemini/OpenAI/Anthropic or
other LLM-provider integration in the product, and none may be added without
an explicit feature need plus updates to `AGENTS.md` and `.env.example`.

## Cursor IDE & agentic ruleset

- Development happens in **Cursor**; the always-on agent ruleset lives at
  `.cursor/rules/hackathon.mdc` (stack, KVKK, commit and verification rules).
- `AGENTS.md` is the canonical agent contract every agent reads first.
- Workflow: agents implement vertical slices, run `scripts/verify.sh`
  (lint/typecheck/build, `go vet`/`go test`, CV determinism check), and commit
  meaningful checkpoints that are pushed for jury review.
- This combination is what made the scaffold fast: rules encode the
  constraints once, so every agent run starts aligned (stack, privacy, env
  hygiene) instead of rediscovering them.

## Hugging Face models & datasets

Verified against the HF API on 2026-06-06 (details in `research/02-huggingface-kaynaklar.md`):

| Purpose | Model | License | Note |
| --- | --- | --- | --- |
| Face anonymization | [`arnabdhar/YOLOv8-Face-Detection`](https://huggingface.co/arnabdhar/YOLOv8-Face-Detection) | AGPL-3.0 | local cache `models/yolov8_face.pt` is SHA256-identical to the HF file |
| Plate anonymization | [`Koushim/yolov8-license-plate-detection`](https://huggingface.co/Koushim/yolov8-license-plate-detection) | MIT (card; AGPL-derivative caveat noted) | local cache `models/yolov8_plate.pt` SHA256-identical |
| Urban objects (default) | [`shirabendor/YOLOV8-oiv7`](https://huggingface.co/shirabendor/YOLOV8-oiv7) | AGPL-3.0 | 601 Open Images V7 classes: waste container, street light, bench, billboard, traffic sign/light |
| Road damage | [`rezzzq/yolo12s-road-damage-rdd2022`](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022) | MIT (card) | RDD2022: D00–D40 crack/pothole classes, municipal vocabulary |
| Serverless fallback | [`facebook/detr-resnet-50`](https://huggingface.co/facebook/detr-resnet-50) | Apache-2.0 | hf-inference "live" — fallback if local inference fails |

**Anonymization-only constraint:** the face/plate models are detectors used
exclusively to locate regions for irreversible masking (`docs/kvkk.md`).
Recognition/OCR models are blacklisted for this project.

## Local model cache

`models/` (gitignored) holds YOLO weights as a development/demo cache only;
Hugging Face is the source of truth. Note from research: the local
`yolov8n.pt` is the GitHub-release build — for a file-level "from Hugging
Face" claim, re-fetch via
`hf_hub_download(repo_id="Ultralytics/YOLOv8", filename="yolov8n.pt")`.
Weights are never committed (`*.pt` ignored).

## Modal (training compute)

Modal may be used for GPU training/fine-tuning **only with data that passed
the local anonymization gate**; checkpoints are promoted to a private Hugging
Face model repo. Modal is never the product backend (Render is). Tokens come
from `.env` (`MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`) and are never printed.

## Cursor SDK bonus plan

Target: a small but real automation — wrap `scripts/generate-demo-report.py`
in a Cursor SDK agent that reads `data/processed/demo-result.json` and
produces the jury-facing demo report (`docs/demo-report.md`), optionally
running the project quality checklist (`scripts/verify.sh`) first.

- Integration point is already marked with `TODO(cursor-sdk)` in
  `scripts/generate-demo-report.py`.
- The script works standalone today, so the bonus can never block the live
  demo (AGENTS.md requirement).
- Once wired, README gets the exact command + sample output. If Cursor CLI is
  used instead/in addition, the commands will be documented here.
