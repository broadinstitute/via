# deploy/terra

Draft for running VIA as a [Leonardo](https://github.com/DataBiosphere/leonardo) custom app in
community Terra. Untested: nothing here has been deployed yet.

How it differs from the Workbench deployment in `../`: Leonardo runs the image as a Kubernetes pod
behind an nginx ingress, not through the devcontainer CLI. So there is no `post-startup.sh`, no
`wondershaper` sidecar and no `~/.workbench-env`; those are Workbench-only.

## Files

- `via-app.yaml` - the app descriptor Leonardo fetches when creating the app.

## Environment variables

Leonardo ignores the descriptor's `environment:` map, so pass these as `customEnvironmentVariables`
in the create-app request:

| Variable | Value |
|---|---|
| `SKIP_WORKBENCH_WAIT` | `true` (otherwise `entrypoint.sh` waits 10 minutes for a file Terra never writes) |
| `WORKBENCH_USER_EMAIL` | the user's email (shown by `/api/profile`) |
| `GOOGLE_PROJECT` | project query jobs are billed to |
| `WORKSPACE_CDR` | CDR dataset as `project.dataset` |
| `VAT_PROJECT_ID`, `VAT_DATASET_ID`, `VAT_TABLE_ID` | the variant annotation table |

Leonardo only injects the workspace name and namespace itself, so the caller supplies the rest.

## Creating the app

Calls the Leonardo v1 apps API (check your deployment's Swagger for the exact route):

```json
POST /api/google/v1/apps/{googleProject}/{appName}
{
  "appType": "CUSTOM",
  "descriptorPath": "https://raw.githubusercontent.com/<org>/via/<ref>/deploy/terra/via-app.yaml",
  "diskConfig": { "name": "via-disk", "size": 10 },
  "customEnvironmentVariables": {
    "SKIP_WORKBENCH_WAIT": "true",
    "WORKBENCH_USER_EMAIL": "you@example.org",
    "GOOGLE_PROJECT": "<billing project>",
    "WORKSPACE_CDR": "<project>.<dataset>",
    "VAT_PROJECT_ID": "<project>",
    "VAT_DATASET_ID": "<dataset>",
    "VAT_TABLE_ID": "<table>"
  }
}
```

## Finding the app's URL

The app is served from Leonardo's proxy, at a path of the form
`/proxy/google/v1/apps/{googleProject}/{appName}/via/`. The host in front of that path depends on
which Terra environment's Leonardo you created the app in, so don't build the URL by hand. Once the
app's status is `RUNNING`, call the get-app endpoint and use the `via` entry of `proxyUrls`:

```
GET /api/google/v1/apps/{googleProject}/{appName}
```

```json
{
  "status": "RUNNING",
  "proxyUrls": { "via": "<full URL to open in a browser>" }
}
```

`proxyUrls` maps each service name from the descriptor to its full proxy URL. The key is `via`
because that is the service's name in `via-app.yaml`.

## Prerequisites outside this repo

- The user is in the Sam group `custom_app_users`, and the descriptor URL is on the Leonardo
  deployment's `customApplicationAllowList` (needed when the project has a `security-group` label).
- The image is on GHCR and pullable by the cluster's nodes. Leonardo only accepts `gcr.io`,
  `ghcr.io` and Docker Hub images in a descriptor, so the Artifact Registry image Workbench uses
  won't do. `docker-build-push.yml` pushes to both. After its first run, make the `via` package
  public, or GKE can't pull it. The package only exists after that first push; find it under the
  repo's Packages sidebar, or at `https://github.com/orgs/broadinstitute/packages`, then Package
  settings > Change visibility. (An org owner may need to allow public packages first.)
  To test a branch, run the workflow by hand on that branch and use the `branch-<name>` tag in
  `via-app.yaml`.
- The user's pet service account / proxy group has these BigQuery roles:
  - **BigQuery Job User** (`roles/bigquery.jobUser`) on `GOOGLE_PROJECT`, the project query jobs are
    billed to.
  - **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) on the CDR and VAT datasets (or the
    projects that hold them).

  Without these, `/api/status` fails its BigQuery access checks.

  The CDR is All of Us data, which community Terra doesn't have, so these tables must be supplied
  (`data/synthetic/` can produce a demo set).

## Testing a deployment

Opening the proxy URL in a plain browser tab returns `401 Your account is not authenticated` from
Leonardo, before the request reaches VIA. Leonardo's app proxy needs both of these
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
curl "<proxyUrl>api/profile" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Sec-Fetch-Site: same-origin"
```

`<proxyUrl>` is the `via` entry of `proxyUrls` (see above), ending in `/`. Put the options after the
URL; with them first, this failed for us. `/api/profile` should return the email you passed as
`WORKBENCH_USER_EMAIL`, which also confirms the environment variables arrived. `/api/status` runs
the BigQuery access checks, so a successful response there confirms the pet service account and the
datasets are set up.

A `401` with `AuthenticationError` and a null `traceId` means one of the two requirements above is
missing. Leonardo logs the reason (`Referer header is missing and no valid Origin or Sec-Fetch-Site`
for the referer check). Check the token with a normal Leonardo call:
`GET /api/google/v1/apps/{googleProject}/{appName}` with the same header.

### UI, in a browser

Use a header-modifying extension such as ModHeader, restricted to the Leonardo host so the token
isn't sent anywhere else (URL pattern filter, e.g.
`https://leonardo\.<env>\.bee\.envs-terra\.bio/.*`). Add two request headers:

- `Authorization: Bearer <output of gcloud auth print-access-token>`
- `Referer: https://bvdp-saturn-dev.appspot.com/` (any host works in a BEE; elsewhere it must be
  one of that deployment's `VALID_HOSTS`)

Then open `<proxyUrl>`. Tokens expire after about an hour; refresh the header when requests start
returning 401. In devtools, assets should load from `.../via/assets/...` and API calls go to
`.../via/api/...` (see `ui/src/utils/basePath.ts`).

### Real users

Whoever opens the app needs the cookie and a valid referer without any extension. Terra UI does both
for the apps it launches; whether the community Terra UI launches custom apps is unconfirmed. If it
doesn't, users need a helper page on a valid-referer host that calls `/proxy/setCookie` and then
links to the app.
