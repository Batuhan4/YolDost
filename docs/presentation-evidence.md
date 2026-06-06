# Presentation Evidence Pack

This file is the source sheet for jury slides and demo narration. It separates
verified evidence from placeholders so the presentation can be finished without
inventing deployment status, model quality, or safety claims.

## Safe Product Claim

YolDost compares walking alternatives around the idea **"en kalabalik/aktif,
daha guvenli rota potansiyeli"**. Supporting safety/comfort signals include
green areas, cleanliness, sidewalk quality, lighting, physical openness,
main-street proximity, POI/open-business activity, public/open data, and
authorized aggregated city data.

Use this phrasing:

- "Fiziksel cevre gostergelerine gore daha guvenli rota potansiyeli."
- "Recommended by physical environment indicators."
- "Faces and plates are irreversibly masked before analysis, upload, training,
  or display."
- "The system does not invent a score when physical-analysis coverage is
  missing."

Avoid any wording that implies crime prediction, guaranteed safety, current MVP
camera person counting, unauthorized pedestrian density, demographic inference,
plate reading, tracking, or reversal of anonymization. Use "anonymized" or
"de-identified/anonymized" for privacy wording.

"Kalabalik/aktif" means activity potential from open POI/business context,
main-street proximity, public/open data, and authorized aggregated city signals.
It does not mean current MVP CV person counting. If camera-based person counting
is discussed, keep it behind a future legal/authorized aggregate-data gate.

## Cursor Usage

Verified repository evidence:

- Cursor IDE is the mandated development environment.
- `AGENTS.md` is the canonical agent contract read before work.
- `.cursor/rules/hackathon.mdc` mirrors the always-on hackathon rules for stack,
  KVKK, deployment, AI documentation, verification, and demo language.
- Existing documentation records how agent rules kept implementation aligned:
  `docs/ai-usage.md`, `docs/cursor-route-assistant.md`, and
  `docs/cursor-sdk-automation.md`.

Presentation angle:

"We used Cursor not just as an editor, but as a controlled development system:
repo-local rules prevented stack drift, unsafe privacy claims, and secret
exposure while agents worked on web, mobile, Go API, CV, and docs."

## Cursor SDK Automation

Product integration:

- Endpoint: `POST /api/route-assistant` in the Next.js app.
- Hosting boundary: Vercel server route; the Render Go API remains the routing
  authority.
- Package evidence: `@cursor/sdk` `1.0.16` is recorded in
  `reports/integrations.md`.
- Input: short user question plus structured route metrics.
- Excluded input: coordinates, raw imagery, location history, faces, plates.
- Behavior: explains existing route metrics; cannot calculate or change route
  scores.
- Failure mode: missing or unavailable SDK returns HTTP `503`; there is no mock
  or Gemini fallback.

Bonus automation:

- Command: `cd apps/web && npm run cursor:demo-readiness`.
- Dry-run command: `cd apps/web && npm run cursor:demo-readiness -- --dry-run`.
- Purpose: generate a one-shot Markdown demo-readiness report from repository
  documentation and recorded evidence snippets.
- Safety behavior: reads `CURSOR_API_KEY` from environment/root `.env` without
  printing it, skips gracefully when missing, and does not edit files, create
  agents in cloud, commit, deploy, or run commands.

Presentation placeholder:

- [ ] Paste the final demo-readiness report path or key excerpt after the live
      command has been run.
- [ ] Record whether the live route-assistant call returned success or the
      expected `503` unavailable state.

## Expo Mobile Demo Evidence

Verified implementation:

- App entry: `apps/mobile/App.tsx`.
- Proximity helper: `apps/mobile/offerProximity.ts`.
- Location package: `expo-location`.
- Notification package: `expo-notifications`.
- API target is environment-configured with `EXPO_PUBLIC_API_BASE_URL`; the app
  shows an unavailable state when it is missing instead of silently using
  localhost.
- The foreground flow checks device location services, requests foreground
  location permission, reads the current position, and starts
  `Location.watchPositionAsync` with balanced accuracy, 5 meter distance
  interval, and 5 second time interval.
- The demo partner/cafe offer point is environment-configurable:
  `EXPO_PUBLIC_DEMO_OFFER_NAME`, `EXPO_PUBLIC_DEMO_OFFER_PARTNER`,
  `EXPO_PUBLIC_DEMO_OFFER_AREA`, `EXPO_PUBLIC_DEMO_OFFER_LATITUDE`,
  `EXPO_PUBLIC_DEMO_OFFER_LONGITUDE`,
  `EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS`, and
  `EXPO_PUBLIC_DEMO_OFFER_TEXT`.
- `getOfferProximity` uses a haversine distance helper and compares the current
  foreground location to the configured offer radius.
- Local offer notifications are scheduled through `expo-notifications` on the
  `partner-offers` channel when the user is inside the configured radius and
  notification permission is granted.
- A visible presenter button, **Send explicit demo offer notification**, can
  schedule the same local notification for stage verification when the presenter
  is not physically near the configured point. This is a presenter test hook,
  not a silent mock fallback and it does not affect route scores.

Recorded verification:

- `cd apps/mobile && npm run typecheck` passed.
- `cd apps/mobile && npx expo-doctor` passed, 21/21 checks.

Concise physical phone test steps:

1. Configure `EXPO_PUBLIC_API_BASE_URL` with the real Render API URL and set the
   demo offer env variables to the cafe/Komagene-style point that will be
   tested.
2. Open the Expo app on a phone, confirm the API card shows the Render URL, then
   tap **Start foreground tracking**.
3. Allow foreground location and notification permissions.
4. Confirm the Foreground Location card reaches `tracking`, shows current
   coordinates, and shows distance to the configured offer point.
5. If the phone is inside `EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS`, confirm the
   local offer notification appears automatically.
6. If not physically nearby, tap **Send explicit demo offer notification** and
   confirm the local notification appears.
7. Tap **Stop** and confirm foreground tracking stops.

Physical demo placeholders:

- [ ] Real phone model / OS:
- [ ] Expo mode: Expo Go / EAS build:
- [ ] Real phone foreground location result:
- [ ] Real phone local notification result:
- [ ] Confirmed configured offer point and radius:
- [ ] Confirmed Render API URL used by phone:

## Hugging Face Datasets And Models

Dataset evidence:

- Demo dataset: `Reubencf/streetview-global`.
- Source: Mapillary-derived imagery.
- License: `CC-BY-SA-4.0`.
- Recorded local baseline revision:
  `a206537534dc0e8165e0e7d36f08df14795127db`.
- All usable imagery must pass the local anonymization gate before training,
  upload, or display.

Model evidence:

- Segmentation baseline:
  `nvidia/segformer-b0-finetuned-cityscapes-1024-1024` at
  `21b3847fae21ddee674abd31129307b6a1235bd9`.
- Auxiliary Modal classifier base:
  `google/vit-base-patch16-224-in21k` at
  `b4569560a39a0f1af58e3ddaf17facf20ab919b0`.
- Face-region detector for masking:
  `arnabdhar/YOLOv8-Face-Detection`.
- Plate-region detector for masking:
  `Koushim/yolov8-license-plate-detection`.
- Urban object default detector:
  `shirabendor/YOLOV8-oiv7`.
- Road damage detector:
  `rezzzq/yolo12s-road-damage-rdd2022`.

Important boundary:

Face and plate models are anonymization-only detectors. They locate regions for
irreversible masking. They are not recognition, OCR, identity, tracking, or
profiling models.

## Anonymization Evidence

Pipeline claim:

1. Read the frame into local memory.
2. Detect face and plate regions only to locate sensitive areas.
3. Apply irreversible gaussian blur or solid mask.
4. Persist only anonymized derivatives and aggregate anonymization audit counts.
5. Run segmentation/object detection only after anonymization.

Recorded evidence:

- `docs/kvkk.md` documents the operating procedure and deletion checklist.
- `workers/cv/README.md` documents the non-negotiable pipeline order.
- `reports/training-summary.md` records 60 locally anonymized derivatives, 1
  face masked, 13 plates masked, and solid mask with 20% bounding-box padding
  for the selected Modal training evidence.
- `reports/runs/20260606T134500Z-local-baseline/report.md` records one local
  baseline batch where raw streamed images were not written to disk, 0 faces
  and 1 plate were masked, and the method was `solid_mask`.

Talk-track sentence:

"Anonimlestirme geri dondurulemez bir kapidir: yuz ve plaka bolgeleri once
maskelenir; model egitimi, Modal yukleme, segmentasyon ve demo gosterimi ancak
bu anonymized turevler uzerinden ilerler."

## Modal Training Evidence

Modal role:

- Modal is GPU training/fine-tuning compute only.
- Modal is not the product backend; Render-hosted Go remains the core API.
- Upload is allowed only after local anonymization and
  `python3 workers/cv/preflight_manifest.py`.
- Modal logs/artifacts must not contain secrets, raw imagery, face/plate crops,
  plate text, or identifying metadata.

Selected recorded run:

- Run ID: `20260606T121159Z-modal-scene`.
- Scope: auxiliary `street_activity_environment_context_auxiliary`
  classifier.
- Report: `reports/runs/20260606T121159Z-modal-scene/report.md`.
- Preflight: PASS (`records=60`, `files=60`, `sha256=60`,
  `faces_masked=1`, `plates_masked=13`).
- Data: 60 locally anonymized Hugging Face / Mapillary derivatives.
- Balanced subset: 23 urban and 23 suburban samples.
- Split: 36 train, 10 validation.
- GPU: NVIDIA B200.
- Hyperparameters: 5 epochs, batch size 8, learning rate 0.0003, AdamW,
  weight decay 0.01, frozen backbone.
- Selected epoch: 5.
- Training time: 2.702 seconds.
- Metric label: `weak_label_context_agreement`.
- Weak-label context agreement: 80.00%.
- Metric label: `macro_f1_weak_label_context`.
- Macro F1 (weak-label context): 0.8000.
- Checkpoint storage: private Modal Volume
  `omnisight-training-checkpoints`.
- Checkpoint path:
  `/omnisight-checkpoints/20260606T121159Z-modal-scene/classifier-head.pt`.
- Checkpoint SHA-256:
  `1d92fc3189d9fba7505407542cf3145950b8690035cda9418741fc39d6791cde`.

Metric label to use on slides:

"Auxiliary weak-label activity/environment context agreement/F1, not
ground-truth street-analysis accuracy."

Do not label this as SegFormer mIoU, route safety accuracy, pedestrian-density
accuracy, or crime prediction.

Latest rerun:

- [x] `modal --version` checked without printing secrets.
- [x] `modal token info` checked without printing token values.
- [x] `python3 workers/cv/preflight_manifest.py` passed immediately before any
      rerun/upload: `records=60`, `files=60`, `sha256=60`,
      `faces_masked=1`, `plates_masked=13`.
- [x] Latest Modal rerun ID: `20260606T121159Z-modal-scene`.
- [x] Latest Modal rerun GPU: NVIDIA B200.
- [x] Latest Modal rerun weak-label agreement: 80.00%.
- [x] Latest Modal rerun macro F1: 0.8000.
- [x] Latest Modal rerun checkpoint SHA-256:
      `1d92fc3189d9fba7505407542cf3145950b8690035cda9418741fc39d6791cde`.
- [x] Latest Modal rerun report path:
      `reports/runs/20260606T121159Z-modal-scene/report.md`.

## Results And Metrics

Physical street-analysis baseline:

- Run ID: `20260606T134500Z-local-baseline`.
- Dataset: `Reubencf/streetview-global` at
  `a206537534dc0e8165e0e7d36f08df14795127db`.
- Model: `nvidia/segformer-b0-finetuned-cityscapes-1024-1024` at
  `21b3847fae21ddee674abd31129307b6a1235bd9`.
- Device: CPU.
- Images: 6.
- Total inference time: 2.938 seconds.
- Throughput: 2.042 images/second.
- Mean built density: 15.38%.
- Mean openness score: 62.48/100.
- Mean sidewalk availability proxy: 17.70/100.
- Supporting vegetation / green-area proxy: 60.14/100.
- Mean road share: 28.09%.
- Mean pedestrian comfort potential: 48.55/100.

Accuracy boundary:

The demo dataset has no matching pixel-level ground truth labels. SegFormer
mIoU, segmentation accuracy, precision, recall, and segmentation confusion
matrix are not claimed. The physical indicators above are transparent proxy
outputs and performance/coverage evidence, not accuracy evidence.

## Tests And Verification

Repository verification commands listed in docs:

- `bash scripts/verify.sh`.
- `python3 workers/cv/preflight_manifest.py`.
- `cd services/api && go test ./... && go vet ./...`.
- `cd apps/web && npm run lint && npm run typecheck && npm run build`.
- `cd apps/mobile && npm run typecheck`.
- `cd apps/mobile && npx expo-doctor`.
- `cd apps/web && npm run cursor:demo-readiness -- --dry-run`.

Presentation checklist:

- [ ] Record latest `scripts/verify.sh` result.
- [ ] Record latest Go test/vet result if run separately.
- [ ] Record latest web lint/typecheck/build result if run separately.
- [x] Record latest mobile typecheck result: `npm run typecheck` passed.
- [x] Record latest Expo doctor result: `npx expo-doctor` passed, 21/21.
- [x] Record latest CV preflight result:
      `records=60 files=60 sha256=60 faces_masked=1 plates_masked=13`.
- [ ] Record latest Cursor SDK readiness dry-run result.

## Live Demo Evidence

Recorded after external network smoke checks on 2026-06-06:

- Render API base URL: `https://omnisight-api-70gd.onrender.com`
- Render `GET /health/live` result: `200`, `{"status":"alive"}`
- Render `GET /health/ready` result: `200`, repository `fixture (deterministic demo data)`, database `not_configured`
- Render `GET /api/v1/demo-runs` result: `200`, one fixture demo run returned
- Render `POST /api/v1/routes` result summary: `200`, two live Google `WALK`
  alternatives, `generated_live: true`, `analysis_coverage: 0`,
  `omnisight_score: null` (honest insufficient-coverage boundary)
- Google Routes attribution visible: yes (`"attribution":"Google Maps"`)
- Vercel web URL: `https://web-lake-phi-31.vercel.app`
- Vercel route-submission result summary: production deploy succeeded;
  `NEXT_PUBLIC_API_BASE_URL` and `CURSOR_API_KEY` set on Vercel project `web`
- Expo demo mode: Expo Go / EAS build / simulator / device:
- Expo configured API base URL:
- Expo `GET /api/v1/demo-runs` or visual network evidence:
- Expo foreground location permission/tracking result:
- Expo configured demo offer point/radius:
- Expo local notification result:
- Expo physical phone test status:
- Cursor SDK route-assistant result summary:
- Modal selected evidence report:
  `reports/runs/20260606T121159Z-modal-scene/report.md`
- CV local baseline report:
- Raw data deletion/anonymization checklist status:

## Slide Mapping

Recommended slide/evidence sequence:

1. Problem and product promise: use the safe product claim above.
2. Architecture: Vercel web, Expo mobile, Render Go API, Google Routes,
   Hugging Face CV, Modal training, Cursor SDK assistant.
3. Privacy gate: irreversible face/plate masking before analysis.
4. Metrics: physical indicator baseline plus weak-label auxiliary classifier
   metrics, with accuracy boundaries visible.
5. Live demo evidence: Render/Vercel/Expo/Cursor SDK smoke checks.
6. Limits and next steps: no city-wide coverage yet, no safety guarantee, no
   people counting, no SegFormer mIoU claim without labeled masks.
