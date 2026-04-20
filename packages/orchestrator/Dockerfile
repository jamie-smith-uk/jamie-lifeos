FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/
COPY packages/bot/package.json ./packages/bot/

RUN pnpm install --frozen-lockfile

RUN mkdir -p node_modules/@lifeos && \
    ln -sf /app/packages/shared node_modules/@lifeos/shared

COPY packages/shared ./packages/shared
COPY packages/orchestrator ./packages/orchestrator

RUN cd /app && \
    node_modules/.bin/tsc -p packages/shared/tsconfig.json && \
    node_modules/.bin/tsc -p packages/orchestrator/tsconfig.build.json

FROM node:20-alpine AS runtime

RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/orchestrator/dist ./packages/orchestrator/dist
COPY --from=builder /app/packages/orchestrator/package.json ./packages/orchestrator/package.json
COPY --from=builder /app/package.json ./package.json

USER lifeos

ENV NODE_ENV=production

CMD ["node", "packages/orchestrator/dist/index.js"]
