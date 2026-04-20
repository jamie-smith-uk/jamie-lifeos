FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace root config and all package.json files first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/bot/package.json ./packages/bot/
COPY packages/orchestrator/package.json ./packages/orchestrator/

# Install all workspace dependencies (creates symlinks for workspace:* packages)
RUN pnpm install --frozen-lockfile

# Copy source for the packages we need to build
COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot

RUN cd packages/shared && \
    ../../node_modules/.bin/tsc --project tsconfig.json && \
    cd /app/packages/bot && \
    ../../node_modules/.bin/tsc --project tsconfig.build.json

FROM node:20-alpine AS runtime

RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

WORKDIR /app

# Copy the entire node_modules from builder (includes workspace symlinks)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist
COPY --from=builder /app/packages/bot/package.json ./packages/bot/package.json
COPY --from=builder /app/package.json ./package.json

USER lifeos

ENV NODE_ENV=production

CMD ["node", "packages/bot/dist/index.js"]
