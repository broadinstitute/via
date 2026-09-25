# VIA (Variant Interpretation Application)

VIA helps clinicians rule candidate genetic variants in or out by comparing them against All of Us's full participant cohort, optionally filtered by a condition — no coding required. It runs as a custom app in the All of Us Verily Researcher Workbench.

This repo contains the app's frontend (ui/, TypeScript + React) and backend (api/, Java + Spring Boot), as well as the deployment configuration required to run the application in Verily Workbench (deploy/, startupscript/).


<img width="3024" height="2152" alt="screencapture-localhost-5173-results-2026-09-15-17_05_23" src="https://github.com/user-attachments/assets/37bc8acf-650e-4509-a71e-bf3b6fe869c3" />

## Structure

- `ui/` - React + TypeScript app (Vite).
- `api/` - Java + Spring Boot app, built with Gradle. The API is
  defined API-first in `api/src/main/resources/openapi/api.yaml`
  (server interfaces and models are generated from it at build time).
- `deploy/` - Packaging for this app as a Verily Workbench custom app; see
  [its README](deploy/README.md) for how it combines the frontend and
  backend into a single container.
- `startupscript/` - VM provisioning scripts run via the devcontainer's
  `postCreateCommand`/`postStartCommand`; see [its README](startupscript/README.md)
  for why this lives at the repo root instead of under `deploy/`.
- `scripts/` - Local development helpers (`dev-setup.sh`).
- `data/` - Example data for local development, with generators.

## Local development

From a fresh clone:

```bash
gcloud auth application-default login   # if you haven't already
./scripts/dev-setup.sh
```

`dev-setup.sh` checks your local environment for JDK 21, Node 20+ and gcloud, writes
`.env.local`, and uses your Application Default Credentials to confirm you can
actually read the configured BigQuery tables. If needed, delete `.env.local` to
regenerate it from scratch.

Then run the backend and frontend separately, with Vite proxying `/api` calls
to the backend (see `ui/vite.config.ts`):

```bash
source .env.local

# terminal 1
cd api && ./gradlew bootRun

# terminal 2
cd ui && npm install && npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Environment variables

| Variable | Purpose |
|---|---|
| `WORKBENCH_USER_EMAIL` | The email of the user running VIA |
| `VAT_PROJECT_ID` | Project owning the VAT dataset |
| `VAT_DATASET_ID` | Dataset holding the VAT table |
| `VAT_TABLE_ID` | VAT table backing variant search |
| `GOOGLE_PROJECT` | Project query jobs are billed to |
| `WORKSPACE_CDR` | CDR dataset (`project.dataset`) |

### Browsing the API

With the backend running, Swagger UI is at `http://localhost:8080/swagger-ui`, and
the raw spec it reads is at `http://localhost:8080/openapi/api.yaml`.

### Running as it will run in Workbench

In Workbench, the frontend and backend are packaged into a single container on
one port (Spring Boot serves the built frontend as static resources, so there's
no CORS or reverse proxy to configure). To build and run that image locally:

```bash
docker network create app-network  # first time only
WORKBENCH_USER_EMAIL=you@example.org WORKSPACE_CDR=<project.dataset> SKIP_WORKBENCH_WAIT=true docker compose -f deploy/docker-compose.yaml up --build
```

Then open `http://localhost:8080`.
