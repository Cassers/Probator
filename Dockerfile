# Probator app — SvelteKit (adapter-node) built with pnpm.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Keep dev deps (drizzle-kit, tsx) — the entrypoint uses them for migrate/seed.
RUN pnpm build

FROM node:22-slim AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# App build + the deps needed at runtime and for migrations/seed.
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/lib/server/db ./src/lib/server/db
COPY --from=build /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
