# deploy/terra

Running VIA in community Terra, on a [Leonardo](https://github.com/DataBiosphere/leonardo) GCE
runtime. Leonardo treats the image as RStudio, so Terra UI opens it like any RStudio runtime.

Status: tested in Terra prod.

How it differs from the Workbench deployment in `../`: Leonardo does not run the devcontainer. There
is no `post-startup.sh`, no `wondershaper` sidecar and no `~/.workbench-env`; those are
Workbench-only.

## How it works

Leonardo decides what a runtime image is only by checking for a `JUPYTER_HOME` or `RSTUDIO_HOME`
environment variable. An image that meets Leonardo's "RStudio contract" runs on a GCE runtime as if
it were RStudio, and is served at `/proxy/{project}/{runtime}/rstudio/`. The proxy on the VM strips
that prefix, so VIA sees plain `/` and `/api/...`.

`Dockerfile` here wraps the normal VIA image to meet that contract. Leonardo runs `/init` in the
container when the runtime is created and on every start; `/init` runs `app-start.sh`, which starts
the jar on port 8001.

## Files

- `Dockerfile` - the Terra variant of the image. Takes the jar from the regular VIA image
  (`VIA_IMAGE`) and adds the contract: `RSTUDIO_HOME`, the `rstudio` (UID 1000) and `welder-user`
  (UID 1001) users, and the folders Leonardo's init script touches. `BASE` defaults to a stand-in
  built on `eclipse-temurin:21-jre-noble`; once Terra publishes `terra-app`, pass it as `BASE` and
  the contract steps are skipped.
- `init` - what Leonardo calls; runs `app-start.sh` as `rstudio`.
- `app-start.sh` - sets `WORKBENCH_USER_EMAIL` from `OWNER_EMAIL` and starts the jar on `$APP_PORT`
  (8001). It does not use `entrypoint.sh`, so `SKIP_WORKBENCH_WAIT` is not needed.

## Building and publishing the image

Leonardo only accepts `gcr.io`, `ghcr.io` and Docker Hub image URLs (not Artifact Registry), so the
images go to GHCR.

### With CI (normal)

`.github/workflows/docker-build-push.yml` builds the regular image, then builds `Dockerfile` on top
of it and pushes both to GHCR: `ghcr.io/broadinstitute/via` and `ghcr.io/broadinstitute/via-terra`,
each tagged `:<sha>` plus `:latest` (pushes to `main`) or `:branch-<name>` (manual runs).

To test a branch: push it, then run the workflow by hand (Actions > Build and push Docker image >
Run workflow, pick the branch; or `gh workflow run docker-build-push.yml --ref <branch>`). Use the
`:<sha>` tag so the runtime doesn't change underneath you.

After the first run, make **both** packages public (find them under the repo's Packages sidebar or
`https://github.com/orgs/broadinstitute/packages`, then Package settings > Change visibility), or
the cluster can't pull them. An org owner may need to allow public packages first.

The workflow turns off provenance and SBOM attestations and OCI media types. Without that, buildx pushes an OCI index or manifest,
and Leonardo's image auto-detection fails with `OCI index (or manifest) found, but Accept header does not support
OCI ...`.

### Locally

Build for `linux/amd64`; the VM is amd64, and on Apple Silicon Docker otherwise looks for an arm64
variant of the CI-built image and fails with `no match for platform in manifest`.

```bash
docker build --platform linux/amd64 -f deploy/terra/Dockerfile \
  --build-arg VIA_IMAGE=ghcr.io/broadinstitute/via:<sha> \
  -t ghcr.io/broadinstitute/via-terra:test .

# Check it before pushing; both should respond
docker run --rm --platform linux/amd64 -e OWNER_EMAIL=you@example.org -p 8001:8001 \
  ghcr.io/broadinstitute/via-terra:test
curl localhost:8001/api/profile
```

Run the build from the repo root. To push, `docker login ghcr.io` with a GitHub token that has
`write:packages`, then `docker push`.

## Environment variables

Pass these as `customEnvironmentVariables` in the create-runtime request. Leonardo puts them in the
container environment and `app-start.sh` inherits them.

| Variable | Value |
|---|---|
| `WORKSPACE_CDR` | CDR dataset as `project.dataset` |
| `VAT_PROJECT_ID`, `VAT_DATASET_ID`, `VAT_TABLE_ID` | the variant annotation table |

Leonardo sets `GOOGLE_PROJECT` (the project query jobs are billed to) and `OWNER_EMAIL` itself, so
don't pass them. `app-start.sh` uses `OWNER_EMAIL` as `WORKBENCH_USER_EMAIL` unless that is set.

## Creating the runtime

A startup script (`userScriptUri` / `startUserScriptUri`) is not needed: `/init` runs at create and
at each start.

Calls the Leonardo v1 runtimes API (check your deployment's Swagger for the exact route):

```json
POST /api/google/v1/runtimes/{googleProject}/{runtimeName}
{
  "toolDockerImage": "ghcr.io/broadinstitute/via-terra:<sha>",
  "runtimeConfig": {
    "cloudService": "GCE",
    "machineType": "n1-standard-2",
    "persistentDisk": { "name": "via-disk", "size": 20 }
  },
  "customEnvironmentVariables": {
    "WORKSPACE_CDR": "<project>.<dataset>",
    "VAT_PROJECT_ID": "<project>",
    "VAT_DATASET_ID": "<dataset>",
    "VAT_TABLE_ID": "<table>"
  }
}
```

When the status is `RUNNING`, open it from Terra UI, which opens a GCE runtime as RStudio, so there
is nothing to supply by hand. The app is served at
`https://<leonardo-host>/proxy/<googleProject>/<runtimeName>/rstudio/`.

Limits:

- Terra UI and Leonardo metrics show the runtime as "RStudio".
- Terra UI allows one runtime per user per workspace, so a VIA runtime blocks Jupyter and RStudio in
  that workspace.
- Terra UI lets users enter a custom image for RStudio, so the runtime can be created from the UI
  with `ghcr.io/broadinstitute/via-terra:<sha>`.
- It depends on Leonardo's current init scripts; a change there could break the contract.

## Prerequisites outside this repo

- The user's pet service account / proxy group has these BigQuery roles:
  - **BigQuery Job User** (`roles/bigquery.jobUser`) on `GOOGLE_PROJECT`, the project query jobs are
    billed to. This is what lets VIA submit query jobs.
  - **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) on the CDR and VAT datasets (or the
    projects that hold them). This is what lets VIA read table metadata and data.
- On the runtime, VIA checks this at startup (`BigQueryStartupCheck`, enabled by `app-start.sh`
  through `VIA_REQUIRE_BIGQUERY_ACCESS`). It reads metadata for the VAT and CDR tables and runs a
  dry-run query in `GOOGLE_PROJECT` (which needs Job User but reads and bills nothing). If either
  fails, VIA exits and the runtime's health check never passes, so the runtime ends in `Error`
  instead of serving a UI that fails on every search. The reason is in the container log: look for
  `VIA cannot access BigQuery, so it will not start`, followed by each missing role. Set
  `VIA_REQUIRE_BIGQUERY_ACCESS=false` in `customEnvironmentVariables` to skip it. The check is off
  by default elsewhere (local development, Workbench).
- The CDR is All of Us data, which community Terra doesn't have, so these tables must be supplied
  (`data/synthetic/` can produce a demo set).

## Testing a deployment

Open the runtime from Terra UI, as for RStudio. Terra UI provides the Leonardo login and referer, so
no token or header setup is needed.

1. **The app loads.** In devtools, assets should come from `.../rstudio/assets/...` and API calls go
   to `.../rstudio/api/...` (see `ui/src/utils/basePath.ts`).
2. **BigQuery works.** Run a search. It submits a real query job against the CDR, so it exercises job
   permission and billing on `GOOGLE_PROJECT` as well as read access.
   `/api/status` only checks table metadata and always returns HTTP 200, so on its own it does not
   show that queries will run; if you use it, require `"accessible": true` for every table.
3. **Missing access shows up at startup.** An account without the BigQuery roles above gets a
   runtime that ends in `Error` (see Prerequisites), with the reason in the container log.
