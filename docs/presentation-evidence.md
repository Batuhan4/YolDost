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

Dataset comparison (June 2026):

| Candidate | License | Practical for anonymized demo prep | Label richness | Decision |
|---|---|---|---|---|
| `Reubencf/streetview-global` | CC-BY-SA-4.0 | Yes: inline images stream locally | VLM weak: setting, weather, time, infrastructure, VQA | **Selected** |
| `NUS-UAL/global-streetscapes` | CC-BY-SA-4.0 | No: imagery in 23 GB+ tar archives | Manual lighting/weather/quality | Deferred |
| `candylion/mapillary-vistas-v2` | CC-BY-NC-SA-4.0 | Yes, but non-commercial license | Pixel segmentation (124 classes) | Rejected |
| `ReinWired/Global_streetscapes_max_50_per_city` | CC-BY-SA-4.0 | Yes, but opaque numeric labels | Unclear activity/environment mapping | Rejected |

Dataset evidence:

- Demo dataset: `Reubencf/streetview-global`.
- Source: Mapillary-derived imagery.
- License: `CC-BY-SA-4.0`.
- Recorded local baseline revision:
  `a206537534dc0e8165e0e7d36f08df14795127db`.
- v2 training corpus target: 300 balanced samples (150 urban + 150 suburban,
  daytime, seed 42) with weak labels for `setting`, `infrastructure`,
  `weather`, `time_of_day`, and `infrastructure_comfort_proxy`.
- All usable imagery must pass the local anonymization gate before training,
  upload, or display.

Model evidence:

- Segmentation baseline:
  `nvidia/segformer-b0-finetuned-cityscapes-1024-1024` at
  `21b3847fae21ddee674abd31129307b6a1235bd9`.
- Auxiliary Modal classifier base (v2):
  `google/vit-base-patch16-224` at
  `3f49326eb077187dfe1c2a2bb15fbd74e6ab91e3`.
- Prior auxiliary baseline:
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
- `reports/training-summary.md` records the anonymized derivative counts, face
  and plate mask totals, and solid mask with 20% bounding-box padding for the
  selected Modal training evidence.
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

Prior recorded run (60-sample baseline):

- Run ID: `20260606T121159Z-modal-scene`.
- Scope: auxiliary `street_activity_environment_context_auxiliary`
  classifier.

Selected recorded run (v2):

- Run ID: `20260606T125349Z-modal-scene`.
- Scope: auxiliary `street_activity_environment_context_auxiliary_v2`
- Samples: 300 (150 urban + 150 suburban), preflight PASS.
- GPU: NVIDIA B200; training ~24s.
- Metrics: `weak_label_context_agreement` 88.33%, `macro_f1_weak_label_context` 0.8833.
- Report: `reports/runs/20260606T125349Z-modal-scene/report.md`.
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
- [x] Latest Modal rerun ID: `20260606T125349Z-modal-scene` (300 samples, 88.33%).
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
- [x] Record latest Cursor SDK route-assistant live call: HTTP `200` on production Vercel (cloud SDK, ~83 s).
- [ ] Record latest Cursor SDK readiness dry-run result.

## Live Demo Evidence

### Automated verification run (`2026-06-06T12:38:31Z` UTC)

Agent: checklist automation (git push, curl smoke, `agent-browser` on production
Vercel). Expo physical-device results are **not** recorded here.

#### Git push

| Check | Result |
| --- | --- |
| `git push -u origin main` | **PASS** — no force push |
| Remote tip | `b71d0b3` — *Document live Vercel deploy and Postgres gap* |
| Notes | Earlier session pushed 7 commits through `be8827a` (YolDost rebrand, Expo→Render proof, hackathon commit policy, env URL hardening, presentation evidence alignment). |

#### Render API (`https://omnisight-api-70gd.onrender.com`)

| Check | Result | Notes |
| --- | --- | --- |
| Pre-warm `GET /health/live` | **PASS** `200` | First cold hit ~5.7s; body `{"status":"alive"}` |
| `GET /health/ready` | **PASS** `200` | `database: not_configured`, `repository: fixture (deterministic demo data)` |
| `GET /api/v1/demo-runs` | **PASS** `200` | One fixture demo run (`demo-fixture-0001`) |
| `POST /api/v1/routes` (lat/lng, Güngören sample) | **PASS** `200` | Two `WALK` alternatives; `generated_live: true`; `analysis_coverage: 0`; `omnisight_score: null`; attribution `Google Maps` |
| `POST /api/v1/routes` (address strings, web UI contract) | **FAIL** `400` | `invalid route request` for flat `origin_address` payloads before `6c4072f` deploy — see redeploy verification below. |

#### Vercel web (`https://web-lake-phi-31.vercel.app`) — `agent-browser`

| Check | Result | Notes |
| --- | --- | --- |
| Page load | **PASS** | Title: *YolDost — Çevresel Göstergelerle Rota* |
| Live API status pill | **PASS** | Shows *Canlı bağlantı hazır* — health poll uses `NEXT_PUBLIC_API_BASE_URL` → Render (not localhost) |
| Route planner submit (prefilled Güngören addresses) | **FAIL** | UI: *Canlı rota servisine ulaşılamadı*; browser `fetch` to Render with address body → `400` |
| Browser `fetch` lat/lng → Render `/api/v1/routes` | **PASS** | `200`, `generated_live: true`, 2 routes — confirms browser can reach live Render with CORS |
| Cursor Route Assistant (UI → `POST /api/route-assistant`) | **FAIL** | Sample prompt *Neden bu rotayı önerdin?* → *Rota Asistanı şu anda kullanılamıyor* (no routes context after failed planner; verify `CURSOR_API_KEY` on Vercel if routes are fixed) |
| Screenshots | saved | `docs/evidence-screenshots/vercel-home-20260606T123514Z.png`, `vercel-route-fail-20260606T123800Z.png`, `vercel-annotate-20260606T123800Z.png` |

#### Render API redeploy verification (`2026-06-06T12:56Z` UTC)

Triggered via Render API (`deploy_id: dep-d8i1hm28qa3s73dvqpj0`) from commit
`6c4072f` after adding flat `origin_address` / `destination_address` aliases.

| Check | Result | Notes |
| --- | --- | --- |
| Deploy status | **PASS** `live` | Service `omnisight-api` (`srv-d8i12b6rnols73b8a2tg`) |
| `POST /api/v1/routes` flat addresses | **PASS** `200` | `{"origin_address":"Gungoren, Istanbul","destination_address":"Galata Tower, Istanbul"}` → 2 routes, `generated_live: true`, default `preference: balanced` |
| `POST /api/v1/routes` nested addresses | **PASS** `200` | Web UI contract (`origin.address` / `destination.address`) → 2 routes |
| `POST /api/v1/routes` lat/lng | **PASS** `200` | Güngören sample coordinates → 2 routes |

#### Vercel route-assistant curl (sanity)

| Check | Result |
| --- | --- |
| `POST https://web-lake-phi-31.vercel.app/api/route-assistant` with empty `routes` | **FAIL** `400` — `invalid_request` (expected without route metrics) |

### Automated verification run (`2026-06-06T13:05Z` UTC)

Agent: production smoke retest after Vercel env restore, route-assistant cloud SDK
fix, Güngören fixture route enrichment, and jury deck export.

#### Render API (`https://omnisight-api-70gd.onrender.com`)

| Check | Result | Notes |
| --- | --- | --- |
| `GET /health/live` | **PASS** `200` | `{"status":"alive"}` |
| `POST /api/v1/routes` nested Turkish addresses (web UI) | **PASS** `200` | Güngören Metro → Belediyesi; 2 routes; 1345 m / 1517 m; `generated_live: true` |
| Route enrichment (post-deploy) | **PENDING** | Commit adds Güngören fixture `street-analyses` spatial join; redeploy required before scores appear live |

#### Vercel web (`https://web-lake-phi-31.vercel.app`)

| Check | Result | Notes |
| --- | --- | --- |
| Production env | **PASS** | `NEXT_PUBLIC_API_BASE_URL`, `CURSOR_API_KEY`, `CURSOR_MODEL` set on project `web` |
| Route planner (`agent-browser`) | **PASS** | Prefilled Güngören addresses → 2 live routes (20 dk / 24 dk); no *Canlı rota servisine ulaşılamadı* error |
| `POST /api/route-assistant` | **PASS** `200` | Cloud Cursor SDK (~83 s); explains `insufficient_analysis_coverage` honestly |
| Screenshot | saved | `docs/evidence-screenshots/vercel-route-success-20260606T160500Z.png` |

#### Presentation / KVKK

| Check | Result |
| --- | --- |
| `presentation/yoldost-deck.pdf` | **PASS** — ~750 KB jury deck export |
| KVKK prep checklist | **PASS** — anonymization gate, preflight, gitignore documented; raw deletion scheduled post-event |

#### Route score boundary (honest)

Live Google routes in Güngören now return `analysis_coverage: 0` until the fixture
enrichment commit is deployed. Enrichment uses only the three Güngören fixture
`street-analyses` points (not invented scores). Routes outside the ~400 m fixture
corridor remain explicitly unscored.

#### Still pending — **USER**

- [ ] Expo on phone with `EXPO_PUBLIC_API_BASE_URL=https://omnisight-api-70gd.onrender.com`
- [ ] Physical device foreground location + local notification evidence
- [ ] Optional Render Postgres (`DATABASE_URL`) for non-fixture persistence

### Manual evidence — **USER** (placeholders)

Do **not** mark complete until you run these on a physical device / dashboard:

- [ ] **Expo on phone** with `EXPO_PUBLIC_API_BASE_URL=https://omnisight-api-70gd.onrender.com` (Expo Go or EAS build).
- [ ] **Expo network proof**: `GET /api/v1/demo-runs` or devtools/network showing Render host (not localhost).
- [ ] **Foreground location** permission and tracking behavior on device.
- [ ] **Local notification** delivery for configured demo offer point/radius.
- [x] **Render dashboard**: GitHub-connected auto-deploy on `main`; manual API redeploy verified for address routes (`6c4072f`).
- [ ] **Optional Postgres**: set `DATABASE_URL` on Render if moving off fixture-only persistence.

### Reference URLs (unchanged)

- Render API base: `https://omnisight-api-70gd.onrender.com`
- Vercel web: `https://web-lake-phi-31.vercel.app`
- Modal evidence report: `reports/runs/20260606T121159Z-modal-scene/report.md`

### Other evidence slots (unchanged / pending)

- Expo demo mode: _pending user device test_
- Expo configured API base URL: _pending user device test_
- Expo `GET /api/v1/demo-runs` or visual network evidence: _pending user device test_
- Expo foreground location permission/tracking result: _pending user device test_
- Expo configured demo offer point/radius: _pending user device test_
- Expo local notification result: _pending user device test_
- Expo physical phone test status: _pending user device test_
- CV local baseline report: _not run in this automation pass_
- Raw data deletion/anonymization checklist status: _document separately per README/KVKK note_


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
