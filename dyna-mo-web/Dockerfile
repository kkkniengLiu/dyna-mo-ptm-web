FROM node:20-bookworm-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack pnpm install --frozen-lockfile

COPY . .
RUN test -f public/data/master_table.json
RUN corepack pnpm exec vite build && corepack pnpm exec tsx scripts/post-build.ts

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
