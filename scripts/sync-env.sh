#!/usr/bin/env bash
# Syncs client-safe env vars from repo root .env into web/mobile .env.local.
# Never prints secret values. Safe to run after editing root .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found — copy .env.example to .env first"
  exit 1
fi

python3 - "$ENV_FILE" "$ROOT" <<'PY'
import sys
from pathlib import Path

env_path = Path(sys.argv[1])
root = Path(sys.argv[2])

def parse_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        return data
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data

def upsert(path: Path, updates: dict[str, str]) -> None:
    lines = path.read_text().splitlines() if path.exists() else []
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            out.append(line)
            continue
        key = line.split("=", 1)[0].strip()
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key, value in updates.items():
        if key not in seen:
            out.append(f"{key}={value}")
    path.write_text("\n".join(out).rstrip() + "\n")

root_env = parse_env(env_path)
maps_key = root_env.get("GOOGLE_MAPS_API_KEY", "")
street_key = root_env.get("GOOGLE_STREET_VIEW_API_KEY", "")

if not street_key and maps_key:
    street_key = maps_key

public_maps = root_env.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "") or maps_key
expo_maps = root_env.get("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY", "") or maps_key

api_base = (
    root_env.get("NEXT_PUBLIC_API_BASE_URL", "")
    or root_env.get("EXPO_PUBLIC_API_BASE_URL", "")
    or "https://omnisight-api-70gd.onrender.com"
)

root_updates: dict[str, str] = {}
if maps_key and not root_env.get("GOOGLE_STREET_VIEW_API_KEY"):
    root_updates["GOOGLE_STREET_VIEW_API_KEY"] = maps_key
if maps_key and not root_env.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"):
    root_updates["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = maps_key
if maps_key and not root_env.get("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"):
    root_updates["EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"] = maps_key
if not root_env.get("NEXT_PUBLIC_API_BASE_URL"):
    root_updates["NEXT_PUBLIC_API_BASE_URL"] = api_base
if not root_env.get("EXPO_PUBLIC_API_BASE_URL"):
    root_updates["EXPO_PUBLIC_API_BASE_URL"] = api_base

if root_updates:
    upsert(env_path, root_updates)
    print(f"UPDATED root .env ({len(root_updates)} keys)")

web_local = root / "apps/web/.env.local"
web_updates = {
    "NEXT_PUBLIC_API_BASE_URL": api_base,
}
if public_maps:
    web_updates["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] = public_maps
if root_env.get("CURSOR_API_KEY"):
    web_updates["CURSOR_API_KEY"] = root_env["CURSOR_API_KEY"]
if root_env.get("CURSOR_MODEL"):
    web_updates["CURSOR_MODEL"] = root_env["CURSOR_MODEL"]
upsert(web_local, web_updates)
print("UPDATED apps/web/.env.local")

mobile_local = root / "apps/mobile/.env.local"
mobile_updates = {
    "EXPO_PUBLIC_API_BASE_URL": api_base,
}
if expo_maps:
    mobile_updates["EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"] = expo_maps
for key in [
    "EXPO_PUBLIC_DEMO_OFFER_NAME",
    "EXPO_PUBLIC_DEMO_OFFER_PARTNER",
    "EXPO_PUBLIC_DEMO_OFFER_AREA",
    "EXPO_PUBLIC_DEMO_OFFER_LATITUDE",
    "EXPO_PUBLIC_DEMO_OFFER_LONGITUDE",
    "EXPO_PUBLIC_DEMO_OFFER_RADIUS_METERS",
    "EXPO_PUBLIC_DEMO_OFFER_TEXT",
]:
    if root_env.get(key):
        mobile_updates[key] = root_env[key]
upsert(mobile_local, mobile_updates)
print("UPDATED apps/mobile/.env.local")
PY

echo "DONE: env sync complete (values not printed)"
