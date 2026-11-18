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
  public (GitHub > Packages > via > Package settings > Change visibility), or GKE can't pull it.
  To test a branch, run the workflow by hand on that branch and use the `branch-<name>` tag in
  `via-app.yaml`.
- The user's pet service account can run BigQuery jobs in `GOOGLE_PROJECT` and read the CDR and VAT
  datasets. The CDR is All of Us data, which community Terra doesn't have, so these tables must be
  supplied (`data/synthetic/` can produce a demo set).
