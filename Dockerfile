# mobile.api in a container: for Timeweb App Platform (and any other Docker host).
#
# The platform mounts nothing, so everything the app reads at runtime is inside
# the image: the webpack bundle, the content configuration next to it and the
# avatars. Everything that differs between environments comes from the
# environment (MONGO_URI, AUTH_TOKEN_SECRET, MINIMUM_APP_VERSION, PORT,
# CORS_ALLOWED_ORIGINS, ...) — there is no file to mount and no secret inside.
#
#   docker build -t mobile-api .
#   docker run -p 3000:3000 --env-file apps/mobile.api/.env mobile-api
#
# Liveness for the platform: GET /api/health (does not touch MongoDB and does
# not check the app version).

ARG NODE_IMAGE=node:24.11.1-alpine

# --- Build ------------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /workspace

# The pnpm release the repository pins (package.json "packageManager").
RUN npm install -g pnpm@11.15.1

# Dependencies before the sources: this layer is reused until the lockfile
# changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN NX_DAEMON=false NX_NO_CLOUD=true pnpm exec nx run mobile.api:build --skip-nx-cache

# What the runtime stage installs: webpack writes the bundle's package.json with
# the exact external versions, and the lockfile is resolved from it in a
# directory outside the workspace (otherwise pnpm would treat it as one more
# workspace package).
WORKDIR /deps
RUN cp /workspace/dist/apps/mobile.api/package.json . \
 && pnpm install --lockfile-only

# --- Runtime ----------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
# The port the app listens on: the platform's proxy forwards to the EXPOSEd one
# (without EXPOSE it would assume 8080).
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=build /deps/package.json /deps/pnpm-lock.yaml ./
RUN npm install -g pnpm@11.15.1 \
 && pnpm install --prod --frozen-lockfile \
 && pnpm store prune \
 && npm uninstall -g pnpm \
 && npm cache clean --force

COPY --from=build /workspace/dist/apps/mobile.api/main.js \
                  /workspace/dist/apps/mobile.api/main.js.map ./
# Baked in by tools/release/pack-backend.mjs for the release archive as well:
# the app reads the configuration next to main.js and serves the avatars from
# "assets" next to it, so nothing has to be set up on the host.
COPY --from=build /workspace/.mount/cfg/mobile-api-configuration.json ./configuration.json
COPY --from=build /workspace/.mount/assets ./assets

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

# The process owns the container: the platform restarts it, logs go to stdout.
CMD ["node", "main.js"]
