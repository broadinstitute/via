# VIA for a Terra GCE runtime (Leonardo treats it as RStudio). Build from the repo root:
#   docker build -f deploy/terra/Dockerfile --build-arg VIA_IMAGE=ghcr.io/broadinstitute/via:<sha> .
#
# BASE defaults to a stand-in that builds the "RStudio contract" itself. Once Terra publishes
# terra-app, build with --build-arg BASE=us.gcr.io/broad-dsp-gcr-public/terra-app:<version>; the
# contract steps below are then skipped because the user already exists.
ARG BASE=eclipse-temurin:21-jre-noble
ARG VIA_IMAGE=ghcr.io/broadinstitute/via:latest
FROM ${VIA_IMAGE} AS via

FROM ${BASE}
# Contract (see deploy/terra/README.md): RSTUDIO_HOME, user rstudio:users (UID 1000) with home
# /home/rstudio, welder-user (UID 1001, shares the work folder), and the folders/files Leonardo's
# init script touches. Ubuntu 24.04 ships a `ubuntu` user at UID 1000, so remove it first.
RUN if ! id rstudio >/dev/null 2>&1; then \
      userdel -r ubuntu 2>/dev/null || true; \
      useradd -m -d /home/rstudio -g users -u 1000 -s /bin/bash rstudio; \
      useradd -m -s /bin/bash -N -u 1001 welder-user; \
      mkdir -p /etc/rstudio/scripts /usr/local/lib/R/etc; \
      touch /etc/rstudio/rserver.conf; \
    fi \
 && mkdir -p /etc/terra /opt/via \
 && if ! command -v java >/dev/null; then \
      apt-get update && apt-get install -y --no-install-recommends openjdk-21-jre-headless \
      && rm -rf /var/lib/apt/lists/*; \
    fi
ENV RSTUDIO_HOME=/etc/rstudio
ENV APP_PORT=8001

COPY --from=via /app/app.jar /opt/via/app.jar
COPY deploy/terra/app-start.sh /etc/terra/app-start.sh
COPY deploy/terra/init /init
RUN chmod +x /init /etc/terra/app-start.sh

# Leonardo replaces the entrypoint and calls /init with docker exec; this is for local runs.
ENTRYPOINT ["/init"]
