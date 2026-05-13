# TimeTracker - Project Overview

> A simple mobile-first work time tracker for two non-technical users.

---

## Purpose

TimeTracker helps two users track when they are working, taking breaks, and ending their workday.

The app is intentionally small and practical. It is not a commercial SaaS product. The main goal is to make time tracking reliable and extremely easy to use from a phone.

Primary flow:

```txt
Open app → confirm selected user/employer → tap Clock In, Clock Out, or End Day
```

---

## Target Users

Initial users:

- Mom
- Dad

User assumptions:

- They are not tech-savvy.
- They will mostly use the app from an iPhone.
- They need a clear, low-friction interface.
- They should not need to select their user/employer every time.

This app optimizes for simplicity over flexibility.

---

## Problem Statement

Manual time tracking is easy to forget, hard to calculate, and annoying to review later.

TimeTracker solves this by recording simple events and deriving the useful information from them:

- worked days
- work sessions
- breaks
- total worked time
- total break time
- downloadable records

---

## Core Concepts

### User

A static person who uses the app.

Users are inserted manually by the developer for now.

### Employer

A company/person the user is working for.

Employers are inserted manually by the developer for now.

### Workday

A workday starts with the first `clock_in` event and ends with an `end_day` event.

Workdays are stored in `work_days` to make current-state lookup, history, stale-day handling, and downloads simpler.

### Event

An event is the audit trail of user actions.

Valid event types:

```txt
clock_in
clock_out
end_day
```

Events are used to reconstruct sessions, breaks, and totals.

---

## Main User States

The UI state is derived from the active workday and its latest event.

| State          | Meaning                                          | Main Actions          |
| -------------- | ------------------------------------------------ | --------------------- |
| `not_started`  | No active workday exists                         | Clock In              |
| `working`      | Active workday, latest event is `clock_in`       | Clock Out, End Day    |
| `on_break`     | Active workday, latest event is `clock_out`      | Clock In, End Day     |
| `needs_review` | Active workday has suspicious or incomplete data | Resolve stale workday |

---

## Business Rules

### Clock In

Allowed when:

```txt
no active workday exists
OR active workday last_event_type = clock_out
```

Rejected when:

```txt
active workday last_event_type = clock_in
```

### Clock Out

Allowed when:

```txt
active workday exists
AND last_event_type = clock_in
```

Rejected otherwise.

### End Day

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

### Stale Workdays

Do not silently invent work time.

If a workday looks stale, the app should ask the user to confirm what happened.

Examples:

- user stayed clocked in for an unusually long time
- user clocked out but never ended the day

If the latest event is `clock_out`, it is safe to offer ending the day at the last clock-out timestamp.

If the latest event is `clock_in`, the user should pick the actual time they stopped working.

---

## Data Architecture

Current database tables:

```txt
users
employers
work_days
events
```

### `users`

Stores static app users.

Important fields:

```txt
id
name
active
created_at
updated_at
```

### `employers`

Stores employers that can be selected in the app.

Important fields:

```txt
id
name
active
created_at
updated_at
```

### `work_days`

Stores the current and summary state of each workday.

Important fields:

```txt
id
user_id
employer_id
work_date
started_at
ended_at
status
last_event_type
last_event_at
created_at
updated_at
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

### `events`

Stores every clock action.

Important fields:

```txt
id
work_day_id
user_id
employer_id
type
occurred_at
created_at
```

Valid `type` values:

```txt
clock_in
clock_out
end_day
```

---

## API Overview

Planned routes:

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

API responsibilities:

- validate inputs
- enforce business rules
- write `work_days` and `events` atomically
- derive current state
- derive history summaries
- generate downloads

---

## Frontend Overview

The app should be a single mobile-first experience.

Main screen sections:

```txt
top area: selected user and employer
action area: current state and clock buttons
history area: filters and history table
footer/download area: download action
```

Device-local storage is only for preferences:

```txt
selectedUserId
selectedEmployerId
```

Work records must never be stored only in browser storage.

---

## Tech Stack

| Layer           | Technology                             |
| --------------- | -------------------------------------- |
| Frontend        | React + Vite + TypeScript              |
| Styling         | Tailwind CSS                           |
| Backend         | Express + TypeScript                   |
| Deployment      | Vercel, two projects from one monorepo |
| Database        | Neon PostgreSQL                        |
| Package manager | pnpm workspaces                        |
| Shared code     | `@time-tracker/shared`                 |

---

## Repository Shape

```txt
time-tracker/
  apps/
    web/          React + Vite frontend
    api/          Express API
  packages/
    shared/       shared types/helpers
  context/        agent context files
  db/             schema, seed data, database setup notes
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

Root `db/` is for SQL schema, seed data, and database setup notes.

`apps/api/src/db/` is for API database client and query code.

---

## Deployment Model

This monorepo is deployed as two Vercel projects:

```txt
time-tracker-web
  Root directory: apps/web

time-tracker-api
  Root directory: apps/api
```

The frontend calls the API using:

```env
VITE_API_BASE_URL=
```

The API connects to Neon using:

```env
DATABASE_URL=
```

The API should allow only the configured frontend origin:

```env
WEB_ORIGIN=
```

---

## UI/UX Guidelines

Prioritize:

- mobile-first layout
- large clear buttons
- obvious current state
- minimal navigation
- few decisions per screen
- readable history
- low-friction download flow

Avoid:

- complex dashboards
- dense admin controls
- unnecessary settings
- advanced filters before MVP
- storing critical data locally

The app should be usable by someone who only understands:

```txt
I am starting work.
I am taking a break.
I am done for today.
```

---

## Current MVP Scope

Include:

- user/employer selection
- localStorage for selected user/employer
- current status
- clock in
- clock out
- end day
- stale-day resolution
- history table
- CSV download

Exclude for now:

- authentication
- roles/permissions
- admin UI
- payroll calculations
- XLSX export
- push notifications
- offline-first behavior
- multi-tenant SaaS features

---

## Implementation Principles

- Keep the app small.
- Prefer explicit business logic over clever abstractions.
- Validate all API inputs.
- Use transactions for clock actions.
- Keep frontend state simple.
- Do not add libraries unless they solve a real current problem.
- Update this file if the product rules or architecture change.
