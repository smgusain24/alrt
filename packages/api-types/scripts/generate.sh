#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"

npx openapi-typescript "$API_URL/openapi.json" -o generated/api.ts
