# AGENTS.md

## Project

TimeTracker is a small, mobile-first time-tracking app for two non-technical users.

The app tracks:

- clock-in events
- clock-out events
- end-day events
- workdays
- work history
- CSV downloads

The main UX goal is simplicity:

> Open app → select user/employer if needed → tap the correct action.

This is not a commercial SaaS app. Keep the implementation small, explicit, and maintainable.

---

## Repository structure

```txt
time-tracker/
  apps/
    web/          React + Vite + TypeScript frontend
    api/          Express API deployed to Vercel
  packages/
    shared/       Shared TypeScript types/helpers
  db/             SQL schema, seeds, database notes
  docs/           Architecture, API, database, and MVP docs
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

Work in the smallest relevant area. Do not touch unrelated files.

---

## Tech stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- pnpm workspace package: `@time-tracker/web`

### Backend

- Express
- TypeScript
- Vercel Functions deployment model
- Neon Postgres
- pnpm workspace package: `@time-tracker/api`

### Shared package

- Shared TypeScript types and small helpers only
- pnpm workspace package: `@time-tracker/shared`

### Database

- PostgreSQL on Neon
- SQL schema lives in `db/`
- Do not expose database credentials to the frontend

---

## Package manager

Use `pnpm` only.

Do not use:

- `npm install`
- `yarn`
- `bun`

Commit `pnpm-lock.yaml`.

Install dependencies in the package that uses them.

Examples:

```zsh
pnpm --filter @time-tracker/web add <package>
pnpm --filter @time-tracker/api add <package>
pnpm --filter @time-tracker/api add -D <package>
pnpm add -D <package> -w
```

Use root dev dependencies only for tools shared across the whole monorepo.

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

Start the Vite frontend.

```zsh
pnpm dev:api
```

Start the local Express API server.

```zsh
pnpm dev
```

Start the configured development workflow for the workspace.

```zsh
pnpm build
```

Build all packages that define a build script.

```zsh
pnpm typecheck
```

Type-check all packages that define a typecheck script.

Use the existing scripts in `package.json` files. Do not invent new commands unless needed.

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

### API environment variables

```env
DATABASE_URL=
WEB_ORIGIN=
```

`DATABASE_URL` is the Neon Postgres connection string.

`WEB_ORIGIN` is the deployed frontend origin allowed by CORS.

### Web environment variables

```env
VITE_API_BASE_URL=
```

Frontend env vars must use the `VITE_` prefix.

---

## Deployment model

This repo is a monorepo deployed as two Vercel projects.

```txt
Vercel project: time-tracker-web
Root directory: apps/web

Vercel project: time-tracker-api
Root directory: apps/api
```

The frontend calls the API using `VITE_API_BASE_URL`.

The API connects to Neon using `DATABASE_URL`.

Do not assume the frontend and backend share the same origin.

---

## Express on Vercel

The API is written using Express, but production runs under Vercel's function model.

Follow this pattern:

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

---

## Database schema

The current database model uses four tables:

```txt
users
employers
work_days
events
```

### Users

Static users such as Mom and Dad.

### Employers

Employers are inserted manually by the developer for now.

### Work days

`work_days` stores the current and summary state of a working day.

Important fields:

```txt
status
last_event_type
last_event_at
started_at
ended_at
```

Valid `status` values:

```txt
active
ended
needs_review
```

Valid `last_event_type` values:

```txt
clock_in
clock_out
end_day
```

### Events

`events` is the audit trail.

Valid `type` values:

```txt
clock_in
clock_out
end_day
```

---

## Business rules

### Clock-in

Allowed when:

```txt
no active workday exists
OR active workday last_event_type = clock_out
```

Rejected when:

```txt
active workday last_event_type = clock_in
```

### Clock-out

Allowed when:

```txt
active workday exists
AND last_event_type = clock_in
```

Rejected otherwise.

### End day

Allowed when:

```txt
active workday exists
```

Behavior:

- creates an `end_day` event
- sets `work_days.ended_at`
- sets `work_days.status = ended`
- sets `last_event_type = end_day`
- sets `last_event_at`

### Stale workday review

If the active workday looks stale, the API/UI should require user confirmation before creating new events.

Examples:

- user is still clocked in after an unusually long time
- user clocked out but never ended the day

Do not silently invent work time.

---

## API routes

Current planned routes:

```txt
GET  /health

GET  /api/users
GET  /api/employers
GET  /api/status

POST /api/events/clock-in
POST /api/events/clock-out
POST /api/events/end-day
POST /api/events/resolve-stale-day

GET  /api/history
GET  /api/download
```

Routes should be thin. Put business logic in services.

Preferred API structure:

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

---

## Frontend UX rules

The app is designed for non-technical users.

Prioritize:

- large buttons
- clear current state
- minimal navigation
- mobile-first layout
- no unnecessary settings
- no hidden complexity

Primary screen should include:

- selected user
- selected employer
- current work state
- main action buttons
- history
- download access

Store only device preferences in `localStorage`, such as:

```txt
selectedUserId
selectedEmployerId
```

Do not store work records in browser storage.

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

## Validation and errors

Validate all API inputs on the server.

Use Zod for request body and query validation.

Return clear error responses.

Do not trust frontend validation.

Do not expose stack traces or secrets in API responses.

---

## Database access

Use the existing Neon/Postgres client strategy in the API.

Do not access the database from the frontend.

Keep SQL explicit and readable.

Prefer transactions when a request writes both:

```txt
work_days
events
```

Clock actions should be atomic.

---

## CORS

The API should only allow the configured frontend origin.

Use:

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

If a command fails because scripts are missing, report that clearly instead of inventing results.

---

## Git and change discipline

Make small, focused changes.

Do not modify generated lockfiles manually.

Do not reformat unrelated files.

Do not rename files or move folders unless the task requires it.

Do not add dependencies without explaining why.

Do not commit secrets.

---

## Documentation rules

Keep documentation short and accurate.

Update docs when changing:

- schema
- API route behavior
- deployment setup
- environment variables
- business rules

Relevant docs live in:

```txt
docs/
db/
AGENTS.md
```

---

## Definition of done

A task is done only when:

- the requested change is implemented
- relevant type checks pass, or failures are reported
- no unrelated files were changed
- environment variables are documented if needed
- schema/API/docs are updated when behavior changes
- the final response explains what changed and how it was verified

---

## Agent behavior

Before editing:

1. Inspect the relevant files.
2. Identify the smallest safe change.
3. Preserve existing project structure.
4. Ask only if the task is genuinely ambiguous.

When implementing:

1. Prefer simple, maintainable code.
2. Keep frontend and API boundaries clear.
3. Keep database writes safe and atomic.
4. Avoid speculative features.

When uncertain:

1. State the uncertainty.
2. Explain the tradeoff.
3. Choose the simplest reversible path.
