# YolDost API (Go)

Go backend for the Cursor x ALT+TAB hackathon, following the
[masterfabric-go](https://github.com/gurkanfikretgunak/masterfabric-go)
architecture (see `docs/architecture.md` for the layer mapping).

## Layout

```
cmd/server/                      entrypoint: config → deps → router → serve
internal/domain/inventory/       entities (model) + persistence ports (repository)
internal/application/inventory/  use cases + DTOs
internal/gateway/                chi router + HTTP handlers
internal/infrastructure/memory/  deterministic fixture repository (dev/test source)
internal/infrastructure/postgres/ Render Postgres adapter (skeleton, see TODO)
internal/shared/                 config, logger, response, errors, middleware
migrations/                      Postgres schema (0001_init.sql)
```

## Run

```bash
make run        # go run ./cmd/server  (listens on PORT, default 8080)
make check      # go vet ./... && go test ./...
make build      # binary at bin/server
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health/live` | Liveness (Render health check) |
| GET | `/health/ready` | Readiness + dependency report |
| GET | `/api/v1/demo-runs` | List demo runs |
| GET | `/api/v1/detections?demo_run_id=` | List detections (optional filter) |
| GET | `/api/v1/street-analyses?demo_run_id=` | List physical street indicators (optional filter) |
| POST | `/api/v1/routes` | Request live Google `WALK` alternatives and YolDost analysis coverage |

## Environment

| Name | Purpose |
| --- | --- |
| `APP_ENV` | `production` on Render, `development` locally |
| `LOG_LEVEL` | `info` for demo deploys; `debug` only for local troubleshooting |
| `PORT` | Listen port (Render injects this) |
| `DATABASE_URL` | Render Postgres DSN |
| `GOOGLE_MAPS_API_KEY` | Google Routes API for live walking alternatives |
| `GOOGLE_STREET_VIEW_API_KEY` | Approved Street View imagery tooling if used |
| `HF_TOKEN` / `HUGGINGFACE_API_KEY` | Hugging Face access (first one wins) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated Vercel/local web origins; defaults to `http://localhost:3000` |

Secret values are never logged — startup logs report presence booleans only.
If the in-memory fixture repository is active, `/health/ready` reports it
explicitly so clients do not mistake fixture-backed data for production
Postgres data.

## Render deploy

- Live service: `https://omnisight-api-70gd.onrender.com` (`omnisight-api`, Frankfurt, free)
- Blueprint: repository-root `render.yaml`
- Service root: `services/api`
- Build command: `go build -o bin/server ./cmd/server`
- Start command: `./bin/server`
- Health check path: `/health/live`
- Required secret/env values in Render: `GOOGLE_MAPS_API_KEY`,
  `DATABASE_URL`, and `CORS_ALLOWED_ORIGINS` set to the Vercel web origin.

External smoke tests:

```bash
export RENDER_API_BASE_URL="https://omnisight-api-70gd.onrender.com"

curl -fsS "$RENDER_API_BASE_URL/health/live"
curl -fsS "$RENDER_API_BASE_URL/health/ready"
curl -fsS "$RENDER_API_BASE_URL/api/v1/demo-runs"
curl -fsS -X POST "$RENDER_API_BASE_URL/api/v1/routes" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":41.0151,"lng":28.8689},"destination":{"lat":41.0192,"lng":28.8725},"preference":"balanced"}'
```

The response must keep Google attribution, set `generated_live: true`, and
leave the legacy `omnisight_score` JSON field as `null` when
physical/activity analysis coverage is insufficient. Activity or `crowded`
context may only come from POI/open-business context, main-street proximity,
public/open data, or authorized aggregated municipal data. It must not claim
actual safety, crime risk, current MVP camera person counting, or unauthorized
pedestrian density.
