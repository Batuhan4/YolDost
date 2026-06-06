#!/usr/bin/env bash
# Runs every check that exists at the current scaffold stage.
# Missing scaffolds are reported as SKIP (not failures) so this script stays
# useful while the monorepo grows. Set SKIP_WEB_BUILD=1 to skip the slow
# Next.js production build during quick iterations.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
failures=0

section() { echo ""; echo "=== $1 ==="; }
pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; failures=$((failures + 1)); }
skip() { echo "SKIP: $1"; }

# --- Shared contracts: every schema must be valid JSON -----------------------
section "packages/contracts"
if [ -d "$ROOT/packages/contracts/schemas" ]; then
  if command -v python3 >/dev/null 2>&1; then
    ok=1
    for f in "$ROOT"/packages/contracts/schemas/*.schema.json; do
      if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" >/dev/null 2>&1; then
        fail "invalid JSON: $f"
        ok=0
      fi
    done
    [ "$ok" -eq 1 ] && pass "all JSON schemas parse"
  else
    skip "python3 not available for schema check"
  fi
else
  skip "packages/contracts not present yet"
fi

# --- Go API ------------------------------------------------------------------
section "services/api (Go)"
if [ -f "$ROOT/services/api/go.mod" ]; then
  if command -v go >/dev/null 2>&1; then
    (cd "$ROOT/services/api" && go vet ./...) && pass "go vet" || fail "go vet"
    (cd "$ROOT/services/api" && go test ./...) && pass "go test" || fail "go test"
  else
    skip "go toolchain not available"
  fi
else
  skip "services/api not present yet"
fi

# --- Next.js web -------------------------------------------------------------
section "apps/web (Next.js)"
if [ -f "$ROOT/apps/web/package.json" ]; then
  if [ -d "$ROOT/apps/web/node_modules" ]; then
    (cd "$ROOT/apps/web" && npm run lint --silent) && pass "web lint" || fail "web lint"
    (cd "$ROOT/apps/web" && npm run typecheck --silent) && pass "web typecheck" || fail "web typecheck"
    if [ "${SKIP_WEB_BUILD:-0}" = "1" ]; then
      skip "web build (SKIP_WEB_BUILD=1)"
    else
      (cd "$ROOT/apps/web" && npm run build --silent) && pass "web build" || fail "web build"
    fi
  else
    skip "apps/web/node_modules missing — run: (cd apps/web && npm install)"
  fi
else
  skip "apps/web not present yet"
fi

# --- Expo mobile -------------------------------------------------------------
section "apps/mobile (Expo)"
if [ -f "$ROOT/apps/mobile/package.json" ]; then
  if [ -d "$ROOT/apps/mobile/node_modules" ]; then
    (cd "$ROOT/apps/mobile" && npx --yes tsc --noEmit) && pass "mobile typecheck" || fail "mobile typecheck"
  else
    skip "apps/mobile/node_modules missing — run: (cd apps/mobile && npm install)"
  fi
else
  skip "apps/mobile not present yet"
fi

# --- Python CV worker --------------------------------------------------------
section "workers/cv (Python)"
if [ -f "$ROOT/workers/cv/run_demo.py" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 -m py_compile "$ROOT/workers/cv/run_demo.py" && pass "cv worker compiles" || fail "cv worker compiles"
    # Placeholder mode is stdlib-only and deterministic: run twice, diff.
    tmp1="$(mktemp)" tmp2="$(mktemp)"
    if python3 "$ROOT/workers/cv/run_demo.py" \
        --input "$ROOT/data/fixtures/demo-input.json" --output "$tmp1" >/dev/null 2>&1 \
      && python3 "$ROOT/workers/cv/run_demo.py" \
        --input "$ROOT/data/fixtures/demo-input.json" --output "$tmp2" >/dev/null 2>&1 \
      && diff -q "$tmp1" "$tmp2" >/dev/null 2>&1; then
      pass "cv worker placeholder run is deterministic"
    else
      fail "cv worker placeholder determinism"
    fi
    rm -f "$tmp1" "$tmp2"
  else
    skip "python3 not available"
  fi
else
  skip "workers/cv not present yet"
fi

# --- Summary -----------------------------------------------------------------
section "summary"
if [ "$failures" -gt 0 ]; then
  echo "RESULT: $failures check(s) FAILED"
  exit 1
fi
echo "RESULT: all available checks passed"
