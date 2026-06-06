#!/usr/bin/env bash
# Live network smoke tests — never prints secret values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
API_BASE="${SMOKE_API_BASE_URL:-https://omnisight-api-70gd.onrender.com}"
WEB_BASE="${SMOKE_WEB_BASE_URL:-https://web-lake-phi-31.vercel.app}"

fail() { echo "FAIL: $1"; exit 1; }
pass() { echo "PASS: $1"; }

echo "=== Live smoke (no secrets printed) ==="

curl -fsS "$API_BASE/health/live" >/dev/null || fail "Render /health/live"
pass "Render /health/live"

curl -fsS "$API_BASE/api/v1/street-analyses" | python3 -c "
import json,sys
data=json.load(sys.stdin)['data']
if not data:
    raise SystemExit('no analyses')
label=data[0].get('source_label','')
if 'Güngören' not in label and 'Gungoren' not in label:
    raise SystemExit(f'unexpected fixture: {label}')
" || fail "Render street-analyses Güngören fixture"
pass "Render Güngören street-analyses"

curl -fsS -X POST "$API_BASE/api/v1/routes" \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":41.0151,"lng":28.8689},"destination":{"lat":41.0192,"lng":28.8725},"preference":"balanced"}' | python3 -c "
import json,sys
r=json.load(sys.stdin)['routes'][0]
if r.get('analysis_coverage',0) <= 0:
    raise SystemExit('analysis_coverage is zero')
if r.get('omnisight_score') is None:
    raise SystemExit('omnisight_score is null')
if not r.get('physical_indicators'):
    raise SystemExit('physical_indicators missing')
" || fail "Render routes scoring"
pass "Render routes + physical_indicators"

if [ -f "$ENV_FILE" ]; then
  python3 - "$ENV_FILE" <<'PY'
import json,sys,urllib.request
from pathlib import Path

env = {}
for line in Path(sys.argv[1]).read_text().splitlines():
    line=line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k,v=line.split('=',1)
    env[k.strip()]=v.strip().strip('"').strip("'")

key = env.get('GOOGLE_MAPS_API_KEY') or env.get('GOOGLE_STREET_VIEW_API_KEY')
if not key:
    raise SystemExit('no google maps key in .env')

url = (
    'https://maps.googleapis.com/maps/api/streetview/metadata'
    '?location=41.0192,28.8725&source=outdoor&key=' + key
)
with urllib.request.urlopen(url, timeout=20) as resp:
    payload = json.load(resp)
status = payload.get('status')
if status != 'OK':
    raise SystemExit(f'street view metadata status={status}')
print('PASS: Street View metadata (Güngören)')
PY
else
  echo "SKIP: Street View metadata (.env missing)"
fi

curl -fsS -o /dev/null -w "%{http_code}" "$WEB_BASE" | grep -q '^200$' || fail "Vercel web homepage"
pass "Vercel web homepage 200"

echo "DONE: live smoke passed"
