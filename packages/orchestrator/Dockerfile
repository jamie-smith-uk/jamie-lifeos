FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/
COPY packages/bot/package.json ./packages/bot/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/orchestrator ./packages/orchestrator
COPY tsconfig.base.json ./

RUN pnpm --filter @lifeos/shared build && pnpm --filter @lifeos/orchestrator build

FROM node:20-alpine AS runtime

RUN npm install -g pnpm@9

RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/orchestrator/dist ./packages/orchestrator/dist

USER lifeos

ENV NODE_ENV=production

CMD ["node", "packages/orchestrator/dist/index.js"]
