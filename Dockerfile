# syntax=docker/dockerfile:1

# Multi-arch Nuxt app image (linux/amd64, linux/arm64)
ARG BUN_VERSION=1.3.14

# ---- dependencies ----
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build ----
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

# ---- runtime ----
FROM oven/bun:${BUN_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

COPY --from=build /app/.output ./.output

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", ".output/server/index.mjs"]
