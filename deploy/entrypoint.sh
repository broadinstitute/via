#!/bin/bash
# entrypoint.sh
#
# The Spring Boot app is the container's PID 1, started immediately when the
# container boots. But Workbench-specific values (OWNER_EMAIL, GOOGLE_PROJECT,
# WORKBENCH_USER_EMAIL, ...) aren't known yet at that point -- they're fetched
# by post-startup.sh (via postCreateCommand, see .devcontainer.json) only
# after the container is already running, and written to /root/.bashrc.
#
# postCreateCommand extracts those exports into /root/.workbench-env once
# post-startup.sh finishes (same approach used by other Workbench app
# templates upstream, e.g. aou-sas/setup-sas-env.sh).
# Wait for that file here, then source it before starting the app, so
# System.getenv() in the Java process actually sees these values.
set -euo pipefail

readonly WORKBENCH_ENV_FILE="/root/.workbench-env"
# post-startup.sh (wb CLI download/login, git-setup, gcsfuse install/mount) has
# been observed taking ~3 minutes on a fresh VM; give it comfortable headroom.
readonly MAX_WAIT_SECONDS=600

if [[ "${SKIP_WORKBENCH_WAIT:-false}" == "true" ]]; then
  echo "SKIP_WORKBENCH_WAIT=true; not waiting for ${WORKBENCH_ENV_FILE} (local dev mode)." >&2
else
  waited=0
  while [[ ! -f "${WORKBENCH_ENV_FILE}" && "${waited}" -lt "${MAX_WAIT_SECONDS}" ]]; do
    sleep 1
    waited=$((waited + 1))
  done

  if [[ -f "${WORKBENCH_ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${WORKBENCH_ENV_FILE}"
  else
    echo "WARNING: ${WORKBENCH_ENV_FILE} not found after ${MAX_WAIT_SECONDS}s; starting without Workbench environment variables." >&2
  fi

  # Checked here, not just left to the app, so the log names where each value should have come
  # from. Neither has a default in application.properties.
  missing=()
  [[ -n "${WORKSPACE_CDR:-}" ]] || missing+=("WORKSPACE_CDR (set on the VM; passed through by docker-compose.yaml)")
  [[ -n "${GOOGLE_PROJECT:-}" ]] || missing+=("GOOGLE_PROJECT (exported by startupscript/setup-bashrc.sh)")
  if [[ "${#missing[@]}" -gt 0 ]]; then
    echo "ERROR: required Workbench environment variables are not set:" >&2
    printf '  - %s\n' "${missing[@]}" >&2
    exit 1
  fi
fi

exec java -jar /app/app.jar
