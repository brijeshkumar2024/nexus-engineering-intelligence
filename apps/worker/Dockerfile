FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install
RUN pnpm --filter @nexus/worker build
CMD ["node","apps/worker/dist/main.js"]