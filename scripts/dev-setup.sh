#!/usr/bin/env bash

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

VAT_PROJECT_ID="${VAT_PROJECT_ID:-$(property_default bigquery.vat-project-id)}"
VAT_DATASET_ID="${VAT_DATASET_ID:-$(property_default bigquery.vat-dataset-id)}"
VAT_TABLE_ID="${VAT_TABLE_ID:-$(property_default bigquery.vat-table-id)}"
# Workbench bills to the workspace's own project; locally that's just the VAT's project.
GOOGLE_PROJECT="${GOOGLE_PROJECT:-${VAT_PROJECT_ID}}"
# The app has no default for this (see application.properties), so it's written out explicitly
# here instead: locally, the synthetic condition lookup tables live alongside the VAT table.
WORKSPACE_CDR="${WORKSPACE_CDR:-${VAT_PROJECT_ID}.${VAT_DATASET_ID}}"

# `source .env.local` is how the backend gets its environment, so a value only exported in this
# shell doesn't count -- the file itself has to set it.
env_file_value() { sed -n "s/^export $1=//p" "${ENV_FILE}" | tail -1; }

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  ok "using your existing .env.local (delete it to regenerate)"
else
  WORKBENCH_USER_EMAIL="$(gcloud config get-value account 2>/dev/null || true)"
  {
    printf 'export JAVA_HOME=%q\n' "${java_home}"
    printf 'export WORKBENCH_USER_EMAIL=%q\n' "${WORKBENCH_USER_EMAIL}"
    printf 'export VAT_PROJECT_ID=%q\n' "${VAT_PROJECT_ID}"
    printf 'export VAT_DATASET_ID=%q\n' "${VAT_DATASET_ID}"
    printf 'export VAT_TABLE_ID=%q\n' "${VAT_TABLE_ID}"
    printf 'export GOOGLE_PROJECT=%q\n' "${GOOGLE_PROJECT}"
    printf 'export WORKSPACE_CDR=%q\n' "${WORKSPACE_CDR}"
  } > "${ENV_FILE}"
  ok "wrote ${ENV_FILE}"
fi
note "table: ${VAT_PROJECT_ID}.${VAT_DATASET_ID}.${VAT_TABLE_ID}"
if [[ -n "$(env_file_value GOOGLE_PROJECT)" ]]; then
  ok "GOOGLE_PROJECT is ${GOOGLE_PROJECT} (query jobs are billed here)"
else
  bad ".env.local doesn't set GOOGLE_PROJECT, the project query jobs are billed to"
  note "the backend won't start without it; for local development it's the VAT's project"
  note "add 'export GOOGLE_PROJECT=${VAT_PROJECT_ID}' to .env.local, or delete .env.local and re-run"
fi
if [[ "$(env_file_value WORKSPACE_CDR)" =~ ^[^.]+\.[^.]+$ ]]; then
  ok "WORKSPACE_CDR is ${WORKSPACE_CDR}"
else
  bad ".env.local must set WORKSPACE_CDR to the CDR dataset as project.dataset (got: '$(env_file_value WORKSPACE_CDR)')"
  note "the backend won't start without it; locally it's the VAT's dataset"
  note "add 'export WORKSPACE_CDR=${VAT_PROJECT_ID}.${VAT_DATASET_ID}' to .env.local, or delete .env.local and re-run"
fi
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

  api="https://bigquery.googleapis.com/bigquery/v2/projects"
  status="$(curl -sS -o "${body}" -w '%{http_code}' \
    -H "Authorization: Bearer ${token}" \
    "${api}/${VAT_PROJECT_ID}/datasets/${VAT_DATASET_ID}")"
  if [[ "${status}" == "200" ]]; then
    ok "dataset ${VAT_PROJECT_ID}:${VAT_DATASET_ID} is readable"
  else
    bad "cannot read dataset ${VAT_PROJECT_ID}:${VAT_DATASET_ID} (HTTP ${status})"
    note "$(api_error)"
    if [[ "${status}" == "403" ]]; then note "ask for roles/bigquery.dataViewer on the dataset"; fi
  fi

  # A dry run is free and checks that the table exists and
  # you can create query jobs in the billing project.
  status="$(curl -sS -o "${body}" -w '%{http_code}' -X POST \
    -H "Authorization: Bearer ${token}" -H 'Content-Type: application/json' \
    -d "{\"configuration\":{\"dryRun\":true,\"query\":{\"useLegacySql\":false,\"query\":
         \"SELECT vid FROM \`${VAT_PROJECT_ID}.${VAT_DATASET_ID}.${VAT_TABLE_ID}\` LIMIT 1\"}}}" \
    "${api}/${GOOGLE_PROJECT}/jobs")"
  if [[ "${status}" == "200" ]]; then
    ok "can query the table (dry run succeeded)"
  else
    bad "cannot query the table (HTTP ${status})"
    note "$(api_error)"
    if [[ "${status}" == "403" ]]; then note "ask for roles/bigquery.jobUser on ${GOOGLE_PROJECT}"; fi
  fi
fi

# ---------------------------------------------------------------------------
if [[ "${problems}" -gt 0 ]]; then
  printf '\n%s problem(s) above. Fix them and re-run, or ask the team.\n' "${problems}"
  exit 1
fi

cat <<'EOF'

Ready. Start the app with:

    source .env.local
    cd api && ./gradlew bootRun    # terminal 1
    cd ui && npm run dev           # terminal 2
EOF
