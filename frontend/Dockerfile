FROM node:20-alpine AS base

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm

FROM base AS deps

COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable pnpm

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-lock.yaml* ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=deps /app/node_modules ./node_modules

RUN pnpm prune --prod

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]

