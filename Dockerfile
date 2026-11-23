FROM node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9 AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build
# bcrypt can compile from source if a prebuilt binary is unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace apps/backend --no-audit --no-fund
COPY tsconfig.base.json ./
COPY libs/shared/src libs/shared/src
COPY apps/backend/tsconfig*.json apps/backend/nest-cli.json apps/backend/
COPY apps/backend/src apps/backend/src
RUN npm exec --workspace apps/backend -- prisma generate \
    && npm run build --workspace apps/backend \
    && test -s apps/backend/dist/apps/backend/src/main.js \
    && npm prune --workspace apps/backend --omit=dev --no-audit --no-fund \
    && npm exec --offline --workspace apps/backend -- prisma generate

FROM base AS runtime
ENV NODE_ENV=production OTEL_SDK_DISABLED=true
COPY --from=build /app/node_modules ./node_modules
WORKDIR /app/apps/backend
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY apps/backend/package.json ./
COPY apps/backend/src/prisma/schema.prisma ./src/prisma/schema.prisma
COPY apps/backend/src/prisma/migrations ./src/prisma/migrations
USER node
CMD ["node", "dist/apps/backend/src/main.js"]
