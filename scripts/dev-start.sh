#!/usr/bin/env bash
# dev-start.sh -- run both halves of the app locally with .env.local loaded:
# the Spring Boot backend on :8080 and the Vite dev server on :5173 (which
# proxies /api to the backend). Ctrl-C stops both.
#
# Run scripts/dev-setup.sh first.

set -euo pipefail
# Monitor mode puts the backend in its own process group, so cleanup can signal
# the whole Gradle -> Spring Boot tree instead of orphaning the app on :8080.
set -m

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

if [[ ! -f .env.local ]]; then
  echo "No .env.local -- run ./scripts/dev-setup.sh first." >&2
  exit 1
fi
# shellcheck disable=SC1091
. ./.env.local
export JAVA_HOME WORKBENCH_USER_EMAIL BIGQUERY_PROJECT_ID BIGQUERY_DATASET_ID BIGQUERY_TABLE_ID

echo "==> backend  http://localhost:8080 (Swagger UI at /swagger-ui)"
(cd api && ./gradlew --console=plain bootRun 2>&1 | sed 's/^/[api] /') &
api_pid=$!
trap 'kill -TERM -- "-${api_pid}" 2>/dev/null || true' EXIT INT TERM

echo "==> frontend http://localhost:5173"
cd ui
[[ -d node_modules ]] || npm ci --no-fund --no-audit
npm run dev
