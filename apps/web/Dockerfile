FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install
RUN pnpm --filter @nexus/web build
CMD ["pnpm","--filter","@nexus/web","dev","--","-H","0.0.0.0"]