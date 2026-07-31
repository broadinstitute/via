# Build context is the repository root (see docker-compose.yaml), so paths
# below are relative to the top of the repo, not this folder.

FROM node:20-alpine AS ui-build
WORKDIR /ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ .
RUN npm run build

FROM gradle:8.14.1-jdk21-noble AS api-build
WORKDIR /api
COPY api/settings.gradle api/build.gradle api/gradlew ./
COPY api/gradle ./gradle
RUN ./gradlew --no-daemon dependencies
COPY api/src ./src
COPY --from=ui-build /ui/dist ./src/main/resources/static
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre-noble
WORKDIR /app
# post-startup.sh (run via postCreateCommand, see .devcontainer.json) requires
# these -- sudo in particular, since it runs every step via
# `sudo -u root bash -l -c ...`, and fails immediately without it.
RUN apt-get update && \
    apt-get install -y --no-install-recommends sudo jq git lsb-release && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
COPY --from=api-build /api/build/libs/*.jar app.jar
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
