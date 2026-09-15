FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install
RUN pnpm --filter @nexus/api build
EXPOSE 4000
CMD ["node","apps/api/dist/main.js"]