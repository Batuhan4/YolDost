# Live Integration Report

## Google Routes

- Owner: Render-hosted Go API
- Endpoint: `POST /api/v1/routes`
- Mode: `WALK`
- Alternatives: requested live from Google Routes API
- Persistence: disabled for Google route payloads
- Attribution: returned as `Google Maps`
- Verified behavior: three live alternatives were returned for the test route
- Physical-analysis coverage behavior: no YolDost score is invented when
  route coverage is unavailable

## Cursor SDK

- Owner: Vercel-hosted Next.js server route
- Endpoint: `POST /api/route-assistant`
- Package: `@cursor/sdk` `1.0.16`
- User authentication: none
- Credential: server-only `CURSOR_API_KEY`
- Input: short question plus structured route metrics
- Excluded input: coordinates, raw imagery, location history, faces, plates
- Isolation: temporary working directory, sandbox enabled, plan mode
- Fallback: none; missing/unavailable Cursor SDK returns HTTP `503`
- Product function: explains route metrics without changing route scores

## Deployment Boundary

The Go service on Render is the mandatory backend and live routing authority.
The Cursor SDK route is an additive AI Adaptation integration on Vercel because
the official SDK is TypeScript. It does not replace the Go API.

## Live Network Smoke Tests (2026-06-06)

| Check | Result |
| --- | --- |
| Render `/health/live` | `{"status":"alive"}` |
| Render `/health/ready` | `database: not_configured`, `repository: fixture (deterministic demo data)` |
| Render Postgres provisioned | **No** — Render API lists zero Postgres instances |
| Render `DATABASE_URL` env | **Not set** on `omnisight-api` |
| Go backend data source | **Fixture-only** — postgres adapter skeleton; `main.go` always uses in-memory repo |
| Render CORS (Vercel origin) | `Access-Control-Allow-Origin: https://web-lake-phi-31.vercel.app` |
| Render CORS (localhost) | `Access-Control-Allow-Origin: http://localhost:3000` |
| Render `GET /api/v1/demo-runs` from Vercel origin | 200, fixture payload |
| Render `POST /api/v1/routes` from Vercel origin | 200, live Google alternatives (`generated_live: true`) |
| Vercel production alias | [https://web-lake-phi-31.vercel.app](https://web-lake-phi-31.vercel.app) |
| Vercel `NEXT_PUBLIC_API_BASE_URL` (Production) | `https://omnisight-api-70gd.onrender.com` |
| Vercel `/` and `/panel` | HTTP 200 |
