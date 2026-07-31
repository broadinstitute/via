# via

VIA helps researchers rule candidate genetic variants in or out by comparing them against All of Us's full participant cohort, optionally filtered by phenotype (HPO term) — no coding required. It runs as a custom app in the All of Us Verily Researcher Workbench.

This repo contains the app's frontend (ui/, TypeScript + React) and backend (api/, Java + Spring Boot), as well as the deployment configuration required to run the application in Verily Workbench (deploy/, startupscript/).
  

<img width="1512" height="962" alt="screencapture-localhost-5173-results-2026-07-31-12_22_16" src="https://github.com/user-attachments/assets/e6bc499e-3241-4cc9-939a-af4b87a4a040" />

## Structure

- `ui/` - React + TypeScript app (Vite). Currently a "Hello world" page that
  fetches the current time from the backend.
- `api/` - Java + Spring Boot app, built with Gradle. The API is
  defined API-first in `api/src/main/resources/openapi/api.yaml`
  (server interfaces and models are generated from it at build time).
- `deploy/` - Packaging for this app as a Verily Workbench custom app; see
  [its README](deploy/README.md) for how it combines the frontend and
  backend into a single container.
- `startupscript/` - VM provisioning scripts run via the devcontainer's
  `postCreateCommand`/`postStartCommand`; see [its README](startupscript/README.md)
  for why this lives at the repo root instead of under `deploy/`.

## Local development

Run the backend and frontend separately, with Vite proxying `/api` calls to the
backend (see `ui/vite.config.ts`):

```bash
# terminal 1
cd api && ./gradlew bootRun

# terminal 2
cd ui && npm install && npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`) - you should see
"Hello world, it's `<timestamp>`".

To see a real value from `GET /api/profile` locally, export `OWNER_EMAIL`
before starting the backend, e.g. `OWNER_EMAIL=you@example.org ./gradlew
bootRun`.

### Running as it will run in Workbench

In Workbench, the frontend and backend are packaged into a single container on
one port (Spring Boot serves the built frontend as static resources, so there's
no CORS or reverse proxy to configure). To build and run that image locally:

```bash
docker network create app-network  # first time only
OWNER_EMAIL=you@example.org SKIP_WORKBENCH_WAIT=true docker compose -f deploy/docker-compose.yaml up --build
```

Then open `http://localhost:8080`.
