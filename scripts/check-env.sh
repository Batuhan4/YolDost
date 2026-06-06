#!/usr/bin/env bash
# Checks that required environment variable NAMES are present, either in the
# current environment or as non-empty entries in .env.
# Prints only PRESENT/MISSING per name — NEVER prints values.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
missing=0

has_var() {
  local name="$1"
  # Set in the current environment?
  if [ -n "${!name:-}" ]; then
    return 0
  fi
  # Present with a non-empty value in .env? (grep only — value is never echoed)
  if [ -f "$ENV_FILE" ] && grep -qE "^${name}=.+" "$ENV_FILE" 2>/dev/null; then
    return 0
  fi
  return 1
}

check_one() {
  local name="$1"
  if has_var "$name"; then
    echo "PRESENT  $name"
  else
    echo "MISSING  $name"
    missing=$((missing + 1))
  fi
}

# Requires at least one name of the group to be present.
check_one_of() {
  local found=""
  for name in "$@"; do
    if has_var "$name"; then
      found="$name"
      break
    fi
  done
  if [ -n "$found" ]; then
    echo "PRESENT  $found (one-of: $*)"
  else
    echo "MISSING  one of: $*"
    missing=$((missing + 1))
  fi
}

echo "== Required env names (values are never printed) =="
check_one_of GOOGLE_MAPS_API_KEY GOOGLE_STREET_VIEW_API_KEY
check_one_of HF_TOKEN HUGGINGFACE_API_KEY
check_one DATABASE_URL
check_one NEXT_PUBLIC_API_BASE_URL
check_one EXPO_PUBLIC_API_BASE_URL

echo ""
echo "== Optional (deploy / local overrides) =="
for name in VERCEL_TOKEN RENDER_API_KEY MODAL_TOKEN_ID MODAL_TOKEN_SECRET CURSOR_API_KEY CURSOR_MODEL PORT CORS_ALLOWED_ORIGINS; do
  if has_var "$name"; then
    echo "PRESENT  $name"
  else
    echo "absent   $name (optional)"
  fi
done

echo ""
if [ "$missing" -gt 0 ]; then
  echo "RESULT: $missing required name(s) missing — fill .env using .env.example"
  exit 1
fi
echo "RESULT: all required env names present"
