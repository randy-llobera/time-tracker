# Manual Historical Imports

Historical imports are manual database scripts. They should be reviewed before
running and should not be executed by agents against Neon.

## Structure

Each imported workday must create:

- one `work_days` row for the target user, employer, and `work_date`
- one related `events` row for every historical clock action
- events ordered by their actual occurrence time

The `work_days` summary fields must match the event sequence:

- `started_at` is the first `clock_in` event timestamp
- `ended_at` is the final `end_day` event timestamp
- `status` is `ended`
- `last_event_type` is `end_day`
- `last_event_at` equals `ended_at`

Use `Europe/Madrid` for the source times unless the historical source says
otherwise. PostgreSQL `timestamptz` values may display as UTC or another session
timezone. For example, Madrid local `14:00` during CEST is the same instant as
`12:00+00`.

## Running

1. Read the SQL file and confirm the target user, employer, timezone, and dates.
2. Run the script manually against the intended database.
3. Confirm the verification result before relying on the imported history.

Do not run this script against Neon from an agent session.

## Duplicate Handling

The import must fail fast if any target `work_days` already exist for the same
user, employer, and imported dates. The script should not skip or replace
existing historical records unless it is intentionally changed and reviewed.
