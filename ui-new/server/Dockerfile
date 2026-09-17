# syntax=docker/dockerfile:1.7

FROM bufbuild/buf:1.58.0 AS buf

FROM rust:1.88-bookworm AS build

COPY --from=buf /usr/local/bin/buf /usr/local/bin/buf

ARG CARGO_REGISTRY_URL

WORKDIR /app

COPY buf.yaml buf.lock ./
COPY proto ./proto
COPY server/Cargo.toml server/Cargo.lock server/build.rs ./server/
COPY server/src ./server/src

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/server/target \
    --mount=type=secret,id=cargo_config,required=false \
    if [ -n "$CARGO_REGISTRY_URL" ]; then \
        mkdir -p /usr/local/cargo; \
        printf '%s\n' \
            '[source.crates-io]' \
            'replace-with = "registry-mirror"' \
            '[source.registry-mirror]' \
            "registry = \"sparse+$CARGO_REGISTRY_URL\"" \
            > /usr/local/cargo/config.toml; \
    elif [ -s /run/secrets/cargo_config ]; then \
        mkdir -p /usr/local/cargo; \
        cp /run/secrets/cargo_config /usr/local/cargo/config.toml; \
    fi \
    && \
    cargo build --locked --release --manifest-path server/Cargo.toml \
    && cp server/target/release/uc-ui-bridge /tmp/uc-ui-bridge

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 unitycatalog \
    && useradd --system --uid 10001 --gid unitycatalog --home-dir /app unitycatalog \
    && mkdir -p /app \
    && chown unitycatalog:unitycatalog /app

COPY --from=build --chown=unitycatalog:unitycatalog /tmp/uc-ui-bridge /usr/local/bin/uc-ui-bridge

ENV PORT=8081

USER unitycatalog
WORKDIR /app

EXPOSE 8081

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=12 \
    CMD ["curl", "--fail", "--silent", "http://localhost:8081/healthz"]

ENTRYPOINT ["uc-ui-bridge"]
