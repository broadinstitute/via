# deploy

Packaging for this app as a Verily Workbench custom app: a React +
TypeScript frontend (`ui/` at the repo root) served by a Java + Spring Boot
backend (`api/` at the repo root), built into a single container.

The `Dockerfile` here builds in two stages: it compiles the frontend with
Node, copies the built assets into the backend's static resources, then
builds the Spring Boot jar with Gradle. The resulting image runs the jar
directly, so the API and the frontend are both served from
port 8080 — no reverse proxy or CORS configuration needed.

This folder is a trimmed-down copy of the packaging conventions from
[verily-src/workbench-app-devcontainers](https://github.com/verily-src/workbench-app-devcontainers)
(the upstream repo also vendors dozens of unrelated app templates, shared
devcontainer features, and a test harness — none of that is used here).
`LICENSE` is the upstream repo's license, kept for attribution.

Note: `startupscript/` lives at the repository root, not here — see
[its README](../startupscript/README.md) for why.

## Configuration

- **Build**: multi-stage `Dockerfile`, build context is the repository root
- **Port**: 8080
- **User**: root
- **Home Directory**: /root

## Access

Once deployed in Workbench, access the app at the app URL.

For local testing:
1. Create Docker network: `docker network create app-network`
2. From the repo root, build and run: `docker compose -f deploy/docker-compose.yaml up --build`
3. Access at: `http://localhost:8080`

## Files

- `Dockerfile` - Multi-stage build combining `ui/` and `api/` into one image
- `.devcontainer.json` - Devcontainer configuration and features
- `docker-compose.yaml` - Docker Compose configuration
- `devcontainer-template.json` - Template options and metadata
- `entrypoint.sh` - Waits for Workbench-specific env vars before starting the jar
- `LICENSE` - Upstream license (see above)

## Usage

In Workbench UI, create a custom app pointing to this repository,
branch `main`, and folder `deploy`
