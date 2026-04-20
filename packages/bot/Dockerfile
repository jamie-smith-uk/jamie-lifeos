FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/bot/package.json ./packages/bot/
COPY packages/orchestrator/package.json ./packages/orchestrator/

RUN pnpm install --frozen-lockfile

RUN mkdir -p node_modules/@lifeos && \
    ln -sf /app/packages/shared node_modules/@lifeos/shared

COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot

RUN ls packages/shared/dist/ && echo "shared dist present"
RUN pnpm --filter @lifeos/bot build

FROM node:20-alpine AS runtime

RUN addgroup -S lifeos && adduser -S lifeos -G lifeos

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/bot/package.json ./packages/bot/
COPY packages/orchestrator/package.json ./packages/orchestrator/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist
COPY --from=builder /app/packages/bot/package.json ./packages/bot/package.json
COPY package.json ./

USER lifeos

ENV NODE_ENV=production

CMD ["node", "packages/bot/dist/index.js"]
