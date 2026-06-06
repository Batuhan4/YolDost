#!/usr/bin/env bash
# Runs the CV worker in deterministic placeholder mode against the committed
# synthetic fixture and writes data/processed/demo-result.json.
# Runs twice and diffs the outputs to prove the demo is repeatable (a jury
# criterion): same input -> byte-identical output.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INPUT="$ROOT/data/fixtures/demo-input.json"
OUTPUT="$ROOT/data/processed/demo-result.json"

mkdir -p "$ROOT/data/processed"

echo "[demo-fixture] run 1/2 -> $OUTPUT"
python3 "$ROOT/workers/cv/run_demo.py" --input "$INPUT" --output "$OUTPUT"

echo "[demo-fixture] run 2/2 -> determinism check"
tmp="$(mktemp)"
python3 "$ROOT/workers/cv/run_demo.py" --input "$INPUT" --output "$tmp" >/dev/null
if diff -q "$OUTPUT" "$tmp" >/dev/null; then
  echo "[demo-fixture] OK: two runs produced byte-identical output (repeatable demo)"
else
  echo "[demo-fixture] ERROR: outputs differ between runs — demo is not deterministic" >&2
  rm -f "$tmp"
  exit 1
fi
rm -f "$tmp"

echo "[demo-fixture] result written to data/processed/demo-result.json (gitignored)"
