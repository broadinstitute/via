# deploy/terra

Running VIA in community Terra, on a [Leonardo](https://github.com/DataBiosphere/leonardo) GCE
runtime. Leonardo is removing GKE support, so this is the path to use; the older GKE custom-app
instructions are kept at the end for reference only.

Status: the GCE runtime path is being tested; the GKE path was tested in a BEE.

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
- `via-app.yaml` - the legacy GKE descriptor (see the last section).

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

When the status is `RUNNING`, open `https://<leonardo-host>/proxy/<googleProject>/<runtimeName>/rstudio/`.
The `proxyUrls`-style lookup of the GKE path does not apply; build the URL from the Leonardo host
you called.

This path needs neither the `custom_app_users` Sam group nor `customApplicationAllowList`.

Limits:

- Terra UI and Leonardo metrics show the runtime as "RStudio".
- Terra UI allows one runtime per user per workspace, so a VIA runtime blocks Jupyter and RStudio in
  that workspace.
- It is unconfirmed whether Terra UI lets users enter a custom image for RStudio; if not, create
  the runtime through the API.
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

Opening the proxy URL in a plain browser tab returns `401 Your account is not authenticated` from
Leonardo, before the request reaches VIA. Leonardo's proxy needs both of these
(`ProxyRoutes.scala` in Leonardo):

1. **A user token**: an `Authorization: Bearer <Google access token>` header, or the `LeoToken`
   cookie that `GET /proxy/setCookie` sets when called with that header.
2. **A passing referer check**, where it is enabled (it is in BEEs and production). The request
   needs a `Referer` (or `Origin`) whose host is in the deployment's `VALID_HOSTS`, or
   `Sec-Fetch-Site: same-origin`. A direct page load sends none of these, so it fails. BEEs list
   `*`, so any `Referer` value passes there; production lists only Terra's own hosts.

Terra UI normally provides both when it opens an app. Without it, supply them yourself.

### Backend, with curl

```bash
BASE="https://<leonardo-host>/proxy/<googleProject>/<runtimeName>/rstudio"
curl "$BASE/api/profile" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Sec-Fetch-Site: same-origin"
```

Put the options after the URL; with them first, this failed for us. `/api/profile` should return
the runtime owner's email, which confirms the environment reached VIA.

Then check BigQuery, in two steps. Do not treat a successful HTTP response from `/api/status` as
proof by itself: it returns HTTP 200 even when tables are inaccessible, and it only calls
`getTable` on each table, which checks **metadata access** and never submits a query job.

1. `GET $BASE/api/status` (same headers). The body must have `"accessible": true`, and every
   entry in `tables` must too. Any `false` carries a `detail` message.
2. `GET "$BASE/api/condition?condition=heart"` (same headers). This runs a real query job against
   the CDR, so it is the check that **job permissions** and billing on `GOOGLE_PROJECT` work. A
   `200` with `candidates` means the credentials, billing project and CDR access are all set up;
   a `500` usually means a missing BigQuery Job User role or a missing/unreadable table (see the
   VIA logs).

Only when both pass is the BigQuery setup confirmed.

A `401` with `AuthenticationError` and a null `traceId` means one of the two proxy requirements
above is missing. Leonardo logs the reason (`Referer header is missing and no valid Origin or
Sec-Fetch-Site` for the referer check).

### UI, in a browser

Use a header-modifying extension such as ModHeader, restricted to the Leonardo host so the token
isn't sent anywhere else (URL pattern filter, e.g. `https://leonardo\.<env>\.bee\.envs-terra\.bio/.*`).
Add two request headers:

- `Authorization: Bearer <output of gcloud auth print-access-token>`
- `Referer: https://bvdp-saturn-dev.appspot.com/` (any host works in a BEE; elsewhere it must be
  one of that deployment's `VALID_HOSTS`)

Then open the proxy URL. Tokens expire after about an hour; refresh the header when requests start
returning 401. In devtools, assets should load from `.../rstudio/assets/...` and API calls go to
`.../rstudio/api/...` (see `ui/src/utils/basePath.ts`).

### Real users

Whoever opens the app needs the cookie and a valid referer without any extension. Terra UI does
both for the apps it launches; whether the community Terra UI opens a VIA runtime is unconfirmed. If
it doesn't, users need a helper page on a valid-referer host that calls `/proxy/setCookie` and then
links to the app.

## Legacy: GKE custom app

Leonardo is removing GKE support, including `appType: CUSTOM`. This worked in a BEE, but don't
build on it. It uses `via-app.yaml` and the regular (port 8080) image, not the Terra variant.

- **Descriptor.** Leonardo fetches `via-app.yaml` from a stable raw URL and reads only its first
  service. It ignores the descriptor's `environment:` map.
- **Image.** `via-app.yaml` points at `ghcr.io/broadinstitute/via:<tag>` (switch from the branch tag
  to `:latest` or a pinned `:<sha>` before merging). It must be public GHCR.
- **Environment variables**, through `customEnvironmentVariables` in the create-app request:
  `SKIP_WORKBENCH_WAIT=true` (otherwise `entrypoint.sh` waits 10 minutes for a file Terra never
  writes), `WORKBENCH_USER_EMAIL`, `GOOGLE_PROJECT`, `WORKSPACE_CDR` and the `VAT_*` variables
  above. Leonardo injects none of these itself.
- **Create:**

  ```json
  POST /api/google/v1/apps/{googleProject}/{appName}
  {
    "appType": "CUSTOM",
    "descriptorPath": "https://raw.githubusercontent.com/<org>/via/<ref>/deploy/terra/via-app.yaml",
    "diskConfig": { "name": "via-disk", "size": 10 },
    "customEnvironmentVariables": { "SKIP_WORKBENCH_WAIT": "true", "...": "..." }
  }
  ```

- **URL.** Call `GET /api/google/v1/apps/{googleProject}/{appName}` and use the `via` entry of
  `proxyUrls` (path form `/proxy/google/v1/apps/{project}/{app}/via/`). Use that URL as the base in
  the testing steps above.
- **Permissions.** The user must be in the Sam group `custom_app_users`, and where the check is on
  and the project has a `security-group` label, the descriptor URL must be on the deployment's
  `customApplicationAllowList` (exact string match; BEEs and dev skip the check).
