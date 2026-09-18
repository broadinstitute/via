#!/usr/bin/env bash
# dev-setup.sh -- get a fresh checkout ready to run.
#
# Checks the toolchain, writes .env.local, confirms your Application Default
# Credentials can actually read the BigQuery table the app queries, and
# installs dependencies. Safe to re-run; it won't overwrite an existing
# .env.local.
#
# This is a convenience, not a requirement: the backend reads plain
# environment variables and falls back to the defaults in
# api/src/main/resources/application.properties.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
APP_PROPERTIES="${REPO_ROOT}/api/src/main/resources/application.properties"

problems=0
step() { printf '\n==> %s\n' "$1"; }
ok() { printf '  ok    %s\n' "$1"; }
note() { printf '        %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; problems=$((problems + 1)); }

# The default baked into application.properties for a ${VAR:default}
# placeholder, so this script doesn't become a second source of truth.
property_default() { sed -n "s/^$1=\${[A-Z_]*:\(.*\)}\$/\1/p" "${APP_PROPERTIES}"; }

cd "${REPO_ROOT}"

# ---------------------------------------------------------------------------
step "Prerequisites"

# Gradle's toolchain (api/build.gradle) needs a JDK 21. Shims like jenv often
# leave JAVA_HOME pointing at a different version, so prefer asking macOS.
java_home="$(/usr/libexec/java_home -v 21 2>/dev/null || echo "${JAVA_HOME:-}")"
if [[ -n "${java_home}" ]] && "${java_home}/bin/java" -version 2>&1 | grep -q '"21'; then
  ok "Java 21 (${java_home})"
else
  bad "no Java 21 JDK found -- api/build.gradle's toolchain needs one"
  note "e.g. brew install --cask corretto@21"
fi

if command -v node >/dev/null && [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -ge 20 ]]; then
  ok "Node $(node -v)"
else
  bad "Node 20+ required (ui/package.json pins a version for volta users)"
fi

if command -v gcloud >/dev/null; then
  ok "gcloud installed"
else
  bad "gcloud not found -- https://cloud.google.com/sdk/docs/install"
fi

# ---------------------------------------------------------------------------
step "Environment (.env.local)"

BIGQUERY_PROJECT_ID="${BIGQUERY_PROJECT_ID:-$(property_default bigquery.project-id)}"
BIGQUERY_DATASET_ID="${BIGQUERY_DATASET_ID:-$(property_default bigquery.dataset-id)}"
BIGQUERY_TABLE_ID="${BIGQUERY_TABLE_ID:-$(property_default bigquery.table-id)}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  ok "using your existing .env.local (delete it to regenerate)"
else
  # Local stand-in for the email Workbench injects on a real VM.
  WORKBENCH_USER_EMAIL="$(gcloud config get-value account 2>/dev/null || true)"
  {
    echo "# Local development environment, written by scripts/dev-setup.sh."
    echo "# Not committed. Sourced by scripts/dev-start.sh, or 'source .env.local'."
    echo
    echo "# JDK for Gradle, pinned because shims often point JAVA_HOME elsewhere."
    printf 'export JAVA_HOME=%q\n' "${java_home}"
    echo
    echo "# Returned by GET /api/profile; Workbench injects this on a real VM."
    printf 'export WORKBENCH_USER_EMAIL=%q\n' "${WORKBENCH_USER_EMAIL}"
    echo
    echo "# BigQuery table backing variant search. Credentials are never set"
    echo "# here -- they always come from Application Default Credentials."
    printf 'export BIGQUERY_PROJECT_ID=%q\n' "${BIGQUERY_PROJECT_ID}"
    printf 'export BIGQUERY_DATASET_ID=%q\n' "${BIGQUERY_DATASET_ID}"
    printf 'export BIGQUERY_TABLE_ID=%q\n' "${BIGQUERY_TABLE_ID}"
  } > "${ENV_FILE}"
  ok "wrote ${ENV_FILE}"
fi
note "table: ${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}"
note "email: ${WORKBENCH_USER_EMAIL:-(none)}"

# ---------------------------------------------------------------------------
step "BigQuery access"

token="$(gcloud auth application-default print-access-token 2>/dev/null || true)"
if [[ -z "${token}" ]]; then
  bad "no Application Default Credentials"
  note "run: gcloud auth application-default login"
else
  body="$(mktemp)"
  trap 'rm -f "${body}"' EXIT
  api_error() { sed -n 's/.*"message": "\(.*\)".*/\1/p' "${body}" | head -1; }

  base="https://bigquery.googleapis.com/bigquery/v2/projects/${BIGQUERY_PROJECT_ID}"
  status="$(curl -sS -o "${body}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    "${base}/datasets/${BIGQUERY_DATASET_ID}")"
  if [[ "${status}" == "200" ]]; then
    ok "dataset ${BIGQUERY_PROJECT_ID}:${BIGQUERY_DATASET_ID} is readable"
  else
    bad "cannot read dataset ${BIGQUERY_PROJECT_ID}:${BIGQUERY_DATASET_ID} (HTTP ${status})"
    note "$(api_error)"
    if [[ "${status}" == "403" ]]; then note "ask for roles/bigquery.dataViewer on the dataset"; fi
  fi

  # A dry run is free and checks the rest in one shot: the table exists, it has
  # the columns the backend selects, and you can create query jobs in the
  # billing project.
  status="$(curl -sS -o "${body}" -w '%{http_code}' -X POST \
    -H "Authorization: Bearer ${token}" -H 'Content-Type: application/json' \
    -d "{\"configuration\":{\"dryRun\":true,\"query\":{\"useLegacySql\":false,\"query\":
         \"SELECT vid FROM \`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET_ID}.${BIGQUERY_TABLE_ID}\` LIMIT 1\"}}}" \
    "${base}/jobs")"
  if [[ "${status}" == "200" ]]; then
    ok "can query the table (dry run succeeded)"
  else
    bad "cannot query the table (HTTP ${status})"
    note "$(api_error)"
    if [[ "${status}" == "403" ]]; then note "ask for roles/bigquery.jobUser on ${BIGQUERY_PROJECT_ID}"; fi
  fi
fi

# ---------------------------------------------------------------------------
step "Dependencies"

if [[ -d ui/node_modules ]]; then
  ok "frontend dependencies present"
else
  echo "        running npm ci ..."
  (cd ui && npm ci --no-fund --no-audit >/dev/null) && ok "frontend dependencies installed"
fi

# Warms Gradle's caches and generates the OpenAPI sources controllers
# implement, so the first bootRun (and your IDE) doesn't have to.
echo "        building the backend (first run downloads Gradle) ..."
if (cd api && JAVA_HOME="${java_home}" ./gradlew -q --console=plain compileJava); then
  ok "backend compiles"
else
  bad "backend build failed -- run ./gradlew compileJava in api/ to see why"
fi

# ---------------------------------------------------------------------------
if [[ "${problems}" -gt 0 ]]; then
  printf '\n%s problem(s) above. Fix them and re-run, or ask the team.\n' "${problems}"
  exit 1
fi

cat <<'EOF'

Ready. Start both servers with:

    ./scripts/dev-start.sh

or run them yourself:

    source .env.local
    cd api && ./gradlew bootRun    # terminal 1
    cd ui && npm run dev           # terminal 2
EOF
