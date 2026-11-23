#!/bin/bash
set -euo pipefail
# Leonardo sets OWNER_EMAIL and GOOGLE_PROJECT in the container environment. Not entrypoint.sh:
# that waits for a Workbench file, so SKIP_WORKBENCH_WAIT is not needed here.
export WORKBENCH_USER_EMAIL="${WORKBENCH_USER_EMAIL:-${OWNER_EMAIL:-}}"
# Refuse to start without BigQuery access (BigQueryStartupCheck): a user who can't query the data
# gets a failed runtime start, not a UI whose searches return 500.
export VIA_REQUIRE_BIGQUERY_ACCESS="${VIA_REQUIRE_BIGQUERY_ACCESS:-true}"
exec java -jar /opt/via/app.jar --server.port="${APP_PORT}" --server.address=0.0.0.0
