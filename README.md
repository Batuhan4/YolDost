# Urban Object Inventory — Cursor x ALT+TAB Hackathon

KVKK-safe urban object inventory for Güngören Municipality: street/city
imagery goes through an **irreversible face & license-plate anonymization
gate**, then inanimate urban objects (signs, billboards, bins, poles, benches,
potholes, …) are detected and served to a map/list dashboard the municipality
can act on.

**Public benefit:** waste-collection vehicles already drive every street;
turning their camera footage into a privacy-safe asset/damage inventory gives
the municipality a continuously refreshed to-do list (broken signs, overflowing
bins, road damage) without hiring survey crews and without processing anyone's
identity.

## Mandatory stack

| Layer | Technology | Deploy target |
| --- | --- | --- |
| Web dashboard | Next.js (App Router, TS) | Vercel |
| Mobile shell | Expo (TS) | Expo Go / EAS |
| Backend API | Go — [masterfabric-go](https://github.com/gurkanfikretgunak/masterfabric-go) architecture | Render.com |
| Database | Postgres via `DATABASE_URL` | Render Postgres |
| AI models/datasets | Hugging Face (see `docs/ai-usage.md`) | local cache in `models/` |
| Imagery source | Google Street View / Maps API | — |
| Training compute | Modal — **anonymized data only** (see `docs/kvkk.md`) | — |
| IDE / agents | Cursor + ruleset in `.cursor/rules/` | — |

No Gemini/OpenAI/Anthropic or other LLM-provider integration in the product —
the AI deliverable is computer vision (see `docs/ai-usage.md`).

## Repository structure

```
apps/web/            Next.js operational dashboard (demo status, KVKK, detections, API health)
apps/mobile/         Expo field shell (single screen, field-review placeholder)
services/api/        Go API — masterfabric-go layering (see docs/architecture.md)
workers/cv/          Python CV worker — anonymization gate + detection (placeholder mode live)
packages/contracts/  JSON Schemas + TS types: the shared data contract
scripts/             check-env / verify / demo-fixture / generate-demo-report
docs/                architecture, kvkk, ai-usage, demo-plan
data/fixtures/       synthetic fixture (metadata only — never imagery)
data/processed/      generated outputs (gitignored)
```

## Local setup

```bash
cp .env.example .env          # fill values — .env is never committed
bash scripts/check-env.sh     # reports PRESENT/MISSING names only, never values
```

Run the pieces (each in its own terminal):

```bash
# Go API → http://localhost:8080
cd services/api && make run

# Web dashboard → http://localhost:3000
cd apps/web && npm install && npm run dev

# Mobile shell (Expo)
cd apps/mobile && npm install && npm run start

# CV worker — deterministic placeholder demo run
bash scripts/demo-fixture.sh
python3 scripts/generate-demo-report.py   # writes docs/demo-report.md
```

## Environment variables

Placeholders live in `.env.example`; real values only in `.env` (gitignored).

| Name | Used by | Purpose |
| --- | --- | --- |
| `GOOGLE_MAPS_API_KEY` / `GOOGLE_STREET_VIEW_API_KEY` | API, worker | imagery source (≤10k request quota, cached) |
| `HF_TOKEN` / `HUGGINGFACE_API_KEY` | worker, API | Hugging Face model/dataset access |
| `DATABASE_URL` | API | Render Postgres DSN |
| `PORT` | API | injected by Render |
| `CORS_ALLOWED_ORIGINS` | API | comma-separated; default `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL` | web | Go API base URL |
| `EXPO_PUBLIC_API_BASE_URL` | mobile | Go API base URL |
| `VERCEL_TOKEN`, `RENDER_API_KEY` | deploy tooling | CLI deploys |
| `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` | training | Modal compute (anonymized data only) |

## Verification

```bash
bash scripts/verify.sh        # runs everything below that exists
```

- contracts: all JSON schemas parse
- Go: `go vet ./...` + `go test ./...` (router, handlers, config tests)
- web: `npm run lint` + `npm run typecheck` + `npm run build`
- mobile: `tsc --noEmit`
- CV worker: compile + **determinism check** (two runs must be byte-identical)

## AI usage

Documented in full in [`docs/ai-usage.md`](docs/ai-usage.md):

- **Cursor IDE + ruleset** — `.cursor/rules/hackathon.mdc` (always-on) encodes
  stack, KVKK and delivery rules; `AGENTS.md` is the canonical agent contract.
  Agents implement, verify (`scripts/verify.sh`) and commit per checkpoint.
- **Hugging Face** — face/plate anonymization models
  (`arnabdhar/YOLOv8-Face-Detection`, `Koushim/yolov8-license-plate-detection`),
  urban object detection (`shirabendor/YOLOV8-oiv7`), road damage
  (`rezzzq/yolo12s-road-damage-rdd2022`); weights cached in `models/`
  (gitignored).
- **Cursor SDK bonus plan** — wrap `scripts/generate-demo-report.py` in a small
  Cursor SDK automation that turns detection output into the jury demo report.
  The script already works standalone, so the bonus can never block the demo.

## KVKK summary

Privacy is a delivery gate, not a feature (full text: [`docs/kvkk.md`](docs/kvkk.md)):

1. **Anonymization before detection** — faces & plates are irreversibly
   blurred/masked first; object detection only ever sees the anonymized
   derivative. The CV worker refuses raw imagery while the pipeline is pending.
2. **No identity capability** — no face recognition, no plate reading/OCR, no
   person profiling, no person/vehicle tracking. The audit trail stores region
   *counts* only; fields for region contents do not exist in the contracts.
3. **No raw data in the repo or cloud** — raw imagery is never committed,
   uploaded, or baked into build artifacts (`data/raw/` is gitignored).
4. **Deletion commitment** — all raw imagery is deleted at hackathon end and
   the deletion is documented (checklist in `docs/kvkk.md`).

## Deployment

| Component | Target | Notes |
| --- | --- | --- |
| `apps/web` | **Vercel** | project root `apps/web`, set `NEXT_PUBLIC_API_BASE_URL` to the Render URL |
| `services/api` | **Render.com** | build `go build -o bin/server ./cmd/server`, start `./bin/server`, health check `/health/live` |
| Database | **Render Postgres** | attach and expose as `DATABASE_URL`; schema in `services/api/migrations/` |

## Demo

3–5 minute jury script with fallbacks: [`docs/demo-plan.md`](docs/demo-plan.md).
Repeatability is enforced: `scripts/demo-fixture.sh` runs the worker twice and
fails if outputs differ.

## Known limits / next steps

- Real anonymization + detection pipeline pending (worker is placeholder-mode;
  it refuses raw imagery by design until the gate is wired).
- Go API serves a deterministic fixture snapshot; Render Postgres adapter is a
  skeleton (`services/api/internal/infrastructure/postgres`, migration ready).
- Web map panel is a placeholder pending Google Maps integration.
- Local npm `min-release-age` policy pinned expo to 56.0.8 (56.0.9 patch was
  <2 days old at scaffold time).
