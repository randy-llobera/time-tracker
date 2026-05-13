-- TimeTracker initial database schema
-- PostgreSQL / Neon

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EMPLOYERS
CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WORK DAYS
CREATE TABLE work_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id),
  employer_id UUID NOT NULL REFERENCES employers(id),

  work_date DATE NOT NULL,

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- active = workday is open
  -- ended = workday is completed
  -- needs_review = workday has suspicious/incomplete data
  status TEXT NOT NULL DEFAULT 'active',

  -- Snapshot of latest event for quick current-state checks
  -- Possible values: clock_in, clock_out, end_day
  last_event_type TEXT NOT NULL,
  last_event_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT work_days_status_check
    CHECK (status IN ('active', 'ended', 'needs_review')),

  CONSTRAINT work_days_last_event_type_check
    CHECK (last_event_type IN ('clock_in', 'clock_out', 'end_day')),

  CONSTRAINT work_days_ended_at_required_when_ended
    CHECK (
      (status = 'ended' AND ended_at IS NOT NULL)
      OR
      (status <> 'ended')
    )
);

-- EVENTS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  work_day_id UUID NOT NULL REFERENCES work_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  employer_id UUID NOT NULL REFERENCES employers(id),

  -- Possible values: clock_in, clock_out, end_day
  type TEXT NOT NULL,

  -- When the event actually happened
  occurred_at TIMESTAMPTZ NOT NULL,

  -- When the event was inserted into the database
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT events_type_check
    CHECK (type IN ('clock_in', 'clock_out', 'end_day'))
);

-- INDEXES

-- Prevent two active workdays for the same user/employer
CREATE UNIQUE INDEX unique_active_work_day_per_user_employer
ON work_days (user_id, employer_id)
WHERE status = 'active';

-- Helps history queries
CREATE INDEX idx_work_days_history
ON work_days (user_id, employer_id, work_date DESC);

-- Helps reconstruct sessions/breaks from events
CREATE INDEX idx_events_work_day_time
ON events (work_day_id, occurred_at);
