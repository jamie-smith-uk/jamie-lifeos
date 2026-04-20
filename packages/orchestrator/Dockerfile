FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace root config and all package.json files first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/
COPY packages/bot/package.json ./packages/bot/

# Install all workspace dependencies (creates symlinks for workspace:* packages)
RUN pnpm install --frozen-lockfile

# Copy source for the packages we need to build
COPY packages/shared ./packages/shared
COPY packages/orchestrator ./packages/orchestrator

RUN cd packages/shared && \
    ../../node_modules/.bin/tsc --project tsconfig.json && \
    cd /app/packages/orchestrator && \
    ../../node_modules/.bin/tsc --project tsconfig.build.json

FROM node:20-alpine AS runtime

RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

WORKDIR /app

# Copy the entire node_modules from builder (includes workspace symlinks)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/orchestrator/dist ./packages/orchestrator/dist
COPY --from=builder /app/packages/orchestrator/package.json ./packages/orchestrator/package.json
COPY --from=builder /app/package.json ./package.json

USER lifeos

ENV NODE_ENV=production

CMD ["node", "packages/orchestrator/dist/index.js"]
