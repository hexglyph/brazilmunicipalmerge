# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2 AS deps
WORKDIR /app
COPY bun.lock package.json ./
# Install full dependency set (dev deps needed for Next.js/TypeScript during build)
RUN bun install

FROM oven/bun:1.2 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.2 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["bunx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
