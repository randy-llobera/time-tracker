# AGENTS.md

## Purpose

This file defines operating rules for AI agents working in this repository.

For product context, domain rules, data model, API overview, deployment model, and MVP scope, read:

```txt
context/project-overview.md
```

---

## Repository structure

```txt
time-tracker/
  apps/
    web/          React + Vite + TypeScript frontend
    api/          Express API deployed to Vercel
  packages/
    shared/       Shared TypeScript types/helpers
  context/        Agent-facing project context files
  db/             SQL schema, seeds, database setup notes
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

Work in the smallest relevant area. Do not touch unrelated files.

---

## Required context

Before making non-trivial changes, read:

```txt
context/project-overview.md
```

Use it as the source of truth for:

- app purpose
- target users
- business rules
- data model
- API routes
- frontend UX
- deployment model
- MVP scope

Use `db/schema.sql` as the authoritative SQL schema.

---

## Package manager

Use `pnpm` only.

Do not use:

- `npm install`
- `yarn`
- `bun`

Commit `pnpm-lock.yaml`.

Install dependencies in the package that uses them.

```zsh
pnpm --filter @time-tracker/web add <package>
pnpm --filter @time-tracker/api add <package>
pnpm --filter @time-tracker/api add -D <package>
pnpm add -D <package> -w
```

Use root dev dependencies only for tooling shared across the whole monorepo.

Do not add dependencies without a clear reason.

---

## Common commands

Run from the repository root unless stated otherwise.

```zsh
pnpm install
```

Install workspace dependencies.

```zsh
pnpm dev:web
```

Start the frontend.

```zsh
pnpm dev:api
```

Start the local API server.

```zsh
pnpm dev
```

Start the configured workspace development workflow.

```zsh
pnpm lint
pnpm typecheck
pnpm build
```

Run verification checks.

Use existing scripts. Do not invent new scripts unless the task requires it.

---

## Environment variables

Never commit real `.env` files.

Tracked example file:

```txt
.env.example
```

Ignored real files:

```txt
.env
.env.*
apps/web/.env
apps/api/.env
```

Required variables:

```env
DATABASE_URL=
WEB_ORIGIN=
VITE_API_BASE_URL=
```

Frontend variables must use the `VITE_` prefix.

Do not expose database credentials to the frontend.

---

## API implementation rules

The API is written with Express but deployed under Vercel's function model.

Use this pattern:

```txt
apps/api/src/index.ts   exports the Express app
apps/api/src/server.ts  local development only; calls app.listen()
```

Do not rely on production `app.listen()`.

Do not rely on:

- long-running background processes
- in-memory persistent state
- local persistent files
- server-level schedulers

All durable data must live in Postgres.

Keep API routes thin. Put business logic in services.

Preferred API source structure:

```txt
apps/api/src/
  index.ts
  server.ts
  middleware/
  routes/
  services/
  utils/
  db/           API database client and query code only
```

Root `db/` is for SQL schema, seed data, and database setup notes.

---

## Coding conventions

Use TypeScript strictly.

Prefer:

- simple functions
- clear names
- explicit validation
- small modules
- direct SQL where appropriate
- native `fetch` on the frontend
- minimal abstractions

Avoid:

- premature abstraction
- unnecessary global state libraries
- unnecessary routing libraries
- unnecessary ORM adoption
- broad rewrites
- large unrelated refactors

Use arrow functions for new TypeScript/JavaScript functions when practical.

---

## Validation and data access

Validate all API inputs on the server.

Use Zod for request body and query validation.

Do not trust frontend validation.

Do not access the database from the frontend.

Keep SQL explicit and readable.

Use transactions when a request writes multiple related records.

Do not expose stack traces or secrets in API responses.

---

## CORS

The API should only allow the configured frontend origin from:

```env
WEB_ORIGIN=
```

Do not leave broad `*` CORS in production unless explicitly requested.

---

## Testing and verification

Before marking work done, run the relevant checks.

Preferred full verification:

```zsh
pnpm lint
pnpm typecheck
pnpm build
```

If one of these scripts does not exist yet, report that clearly and run the available checks instead.

For frontend changes, also verify the app starts:

```zsh
pnpm dev:web
```

For API changes, also verify the API starts:

```zsh
pnpm dev:api
```

For deployment-sensitive changes, verify:

- frontend builds
- API health endpoint works
- frontend can call API
- environment variables are documented

Do not claim checks passed unless they were actually run.

---

## Git and change discipline

Make small, focused changes.

Do not:

- modify generated lockfiles manually
- reformat unrelated files
- rename files or move folders unless required
- commit secrets
- change schema/API behavior without updating context files

---

## Documentation rules

Keep documentation short and accurate.

Update the relevant file when changing:

- product behavior: `context/project-overview.md`
- schema: `db/schema.sql`
- agent rules: `AGENTS.md`
- environment requirements: `.env.example`

This project does not currently use a separate `docs/` folder.

---

## Definition of done

A task is done only when:

- the requested change is implemented
- relevant checks pass, or failures are reported
- no unrelated files were changed
- environment variables are documented if needed
- schema/context files are updated when behavior changes
- the final response explains what changed and how it was verified

---

## Agent behavior

Before editing:

1. Inspect the relevant files.
2. Read `context/project-overview.md` for non-trivial work.
3. Identify the smallest safe change.
4. Preserve existing project structure.
5. Ask only if the task is genuinely ambiguous.

When implementing:

1. Prefer simple, maintainable code.
2. Keep frontend and API boundaries clear.
3. Keep database writes safe and atomic.
4. Avoid speculative features.

When uncertain:

1. State the uncertainty.
2. Explain the tradeoff.
3. Choose the simplest reversible path.
