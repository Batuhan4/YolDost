# KVKK & Privacy

KVKK compliance is a **delivery gate** for this project, not a feature.
This document is the operating procedure; the rules are enforced in code and
contracts wherever possible.

## Hard rules

- Detect only **inanimate urban objects**: signs, billboards, bins, poles,
  benches, traffic lights, road damage, municipal infrastructure.
- ❌ No identity detection. ❌ No face recognition. ❌ No license-plate
  reading/OCR. ❌ No person profiling. ❌ No person/vehicle tracking.
- Face and plate **detectors are allowed only to locate regions for
  irreversible anonymization**. Their output is never stored and never used
  as an identity feature (enforced: `workers/cv/run_demo.py` records counts
  only; the contracts have no fields for region contents).
- Raw imagery is never committed, uploaded to public storage, baked into
  Vercel/Render build artifacts, or shown in demos.

## Anonymization pipeline

1. Read the frame (Street View response or field capture) into local memory.
2. Run face detector (`arnabdhar/YOLOv8-Face-Detection`) and plate detector
   (`Koushim/yolov8-license-plate-detection`) to locate regions.
3. Apply irreversible masking — gaussian blur or solid mask — to every region.
   Reversible transforms are not a valid state (`irreversible` is a `const
   true` in the contract).
4. Persist only: the anonymized derivative + an `AnonymizationEvent` with
   `region_type`, `region_count`, `method`. Nothing else.
5. Only then may urban object detection run, and only on the derivative.

The worker **refuses raw imagery** while the pipeline is pending
(`run_demo.py` exits with an explicit KVKK message) — the gate cannot be
skipped by accident.

## What is stored vs. never stored

| Stored | Never stored |
| --- | --- |
| anonymized derivative images | raw frames (beyond transient local processing) |
| detection metadata (class, confidence, bbox, coords) | face/plate crops or pixels |
| anonymization audit **counts** + method | embeddings, identities, plate text |
| demo run statistics | any person-related attribute |

## Modal / training constraint

Modal may be used **only** for training/fine-tuning compute on data that has
already passed the local anonymization gate. Raw or unverified imagery must
never enter a Modal volume, container, log or artifact. Render remains the
product backend.

## Google imagery terms

Street View responses are used within quota (≤10k requests, cached); persisted
artifacts are our **derived detection metadata and anonymized evidence**, and
imagery retention follows Google Maps Platform ToS (no permanent raw caching).

## Raw data deletion checklist (hackathon end)

Run through this list and record date + operator in the delivery document:

- [ ] `data/raw/`, `data/private/`, `data/interim/` emptied (`rm -rf`, then verify with `ls`)
- [ ] temporary capture/upload folders (`captures/`, `uploads/`) emptied
- [ ] OS trash / tmp locations checked for stray frames
- [ ] no raw imagery in any cloud bucket, Modal volume, or CI artifact
- [ ] `git log --stat` reviewed: no image binaries ever committed
- [ ] deletion statement (who/when/what) added to README or delivery doc

**Taahhüt / Commitment:** Hackathon sonunda tüm ham görüntüler geri
döndürülemez şekilde silinir; yalnızca anonimleştirilmiş türevler ve sayısal
tespit metaverisi saklanır. Bu tutanak teslim dokümanının parçasıdır.

## Demo-safe behavior

- Live demos display only anonymized derivatives or the synthetic fixture.
- The committed fixture (`data/fixtures/demo-input.json`) contains metadata
  only — no imagery, no personal data.
- If anonymization cannot be verified for an input, the demo falls back to
  fixture mode instead of showing the input.
