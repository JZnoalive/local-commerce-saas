#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x "apps/ai-bot/venv/bin/python" ]; then
  PY="apps/ai-bot/venv/bin/python"
else
  PY="python3"
fi

echo "1) Ejecutando smoke test..."
"$PY" scripts/smoke_test.py

echo "2) Revisando archivos modificados con el comité..."
"$PY" scripts/ai_council.py --changed || true
