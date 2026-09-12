# apps/agent/Dockerfile
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
RUN bunx turbo run build --filter=agent

# Runtime image was copying the FULL monorepo node_modules from `build`
# (dev + prod deps for app/api/agent/packages/* all at once, ~4.5GB) --
# reinstall production-only deps here instead. Discovered in prod
# (29/08/2026): this image alone, plus apps/api's identical pattern,
# repeatedly exhausted vigiep1's disk (72GB) across rebuild cycles.
# microsandbox/just-bash moved from devDependencies to dependencies in
# apps/agent/package.json first -- eve's sandbox backend needs at least
# one of them importable at runtime even when docker.sock (the preferred
# backend here) is mounted (cf. Task 5's carried-forward minor finding).
FROM build AS prod-deps
# --ignore-scripts : sans ca, la reinstallation redeclenche le postinstall
# de @crm/db ("prisma generate"), qui echoue (exit 127, prisma est une
# devDependency, exclue par --production). Sans objet ici : le Prisma
# Client a deja ete genere pendant `build` (packages/db/src/generated/),
# et ce find ne touche qu'aux node_modules, pas a ce dossier.
RUN find . -maxdepth 4 -type d -name node_modules -prune -exec rm -rf {} + \
	&& bun install --production --frozen-lockfile --ignore-scripts

FROM oven/bun:1.3.12-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=prod-deps /repo /repo
EXPOSE 2000
# Not `bun apps/agent/scripts/start.ts` from /repo: start.ts spawns the `eve`
# CLI via child_process.spawn, which resolves against $PATH, and the plain
# system PATH in this image does not include node_modules/.bin (only "bun
# run" from inside the package augments PATH with its local
# node_modules/.bin -- confirmed empirically: the direct form failed with
# `Executable not found in $PATH: "eve"`, even though
# apps/agent/node_modules/.bin/eve exists on disk). `cd`-ing into the
# package and using `bun run start` mirrors apps/app/Dockerfile's runtime
# CMD pattern and gets the PATH augmentation start.ts's spawn() relies on.
CMD ["sh", "-c", "cd apps/agent && bun run start"]
