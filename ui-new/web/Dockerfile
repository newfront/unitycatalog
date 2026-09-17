# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.14-slim AS build

ARG NPM_REGISTRY_URL

WORKDIR /app

COPY package.json bun.lock ./
RUN if [ -n "$NPM_REGISTRY_URL" ]; then \
        bun install --frozen-lockfile --registry "$NPM_REGISTRY_URL"; \
    else \
        bun install --frozen-lockfile; \
    fi

COPY . .
RUN bun run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
