# apps/app/Dockerfile
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
# opens a connection. A build-time placeholder satisfies that check; apps/app
# never connects to the database directly at runtime — the real value (used
# by the api/agent containers) is irrelevant here.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public"
# apps/app depends on the "api" workspace package (for its tRPC app-router
# type), which carries its own postinstall (scripts/chmod-trpc-binary.mjs,
# copied above) that `bun install` runs as part of resolving this workspace.
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
ARG API_URL
ARG APP_URL
ENV API_URL=${API_URL}
ENV APP_URL=${APP_URL}
# Build @crm/db (prisma generate) and api first via turbo/bun — both build
# fine under bun. `next build` itself does NOT: under bun, Next.js 16's
# "Collecting page data" phase (worker_threads loading a compiled runtime
# chunk as CommonJS) segfaults Bun outright ("Expected CommonJS module to
# have a function wrapper... Bun has crashed"), a real Bun/Next-worker
# incompatibility, not a code bug. Fix: run `next build` itself with a real
# Node.js binary (copied from the official node image — root package.json's
# engines field already requires node >=22, this satisfies it) while bun
# still owns install/db/api. Turbo isn't needed for this single command.
# Pinned to the exact patch tag verified to run standalone inside this Bun
# image (not the floating `22-slim` tag) — a future patch bump could ship a
# different glibc than what was tested here.
COPY --from=node:22.23.2-slim /usr/local/bin/node /usr/local/bin/node
RUN bunx turbo run build --filter=api
RUN cd apps/app && /usr/local/bin/node node_modules/.bin/next build

# Nothing in this app runs under bun at runtime (`next start` needs real
# Node — see build stage comment), so the runtime stage is Node directly
# rather than Bun-plus-a-borrowed-node-binary: simpler, and it removes the
# risk of a rebuild pulling a Bun base and a Node base with mismatched
# glibc versions.
FROM node:22.23.2-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo /repo
EXPOSE 3000
CMD ["sh", "-c", "cd apps/app && node node_modules/.bin/next start -H 0.0.0.0 -p 3000"]
