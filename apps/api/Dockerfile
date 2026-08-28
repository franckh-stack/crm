# apps/api/Dockerfile
FROM oven/bun:1.3.12 AS deps
WORKDIR /repo
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/scripts/ apps/api/scripts/
COPY apps/app/package.json apps/app/package.json
COPY apps/agent/package.json apps/agent/package.json
COPY packages/ packages/
# @crm/db's postinstall runs `prisma generate`, and prisma.config.ts resolves
# DATABASE_URL eagerly (env(...) throws if unset) even though `generate` never
# opens a connection. A build-time placeholder satisfies that check; the real
# value is supplied at `docker run` time and overrides this.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bunx turbo run build --filter=api

FROM oven/bun:1.3.12-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 3001
CMD ["bun", "apps/api/dist/main.js"]
