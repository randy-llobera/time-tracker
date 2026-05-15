-- Manual historical import for db/historical_data.txt
-- Target: Rosa / Os Petiscos de Margarita
-- Source times: Europe/Madrid local time
--
-- Review this file before running it manually. Do not run it against Neon from
-- an agent session.

BEGIN;

CREATE TEMP TABLE manual_history_import_events (
  work_date DATE NOT NULL,
  event_order INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'end_day')),
  local_time TIME NOT NULL,
  day_offset INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (work_date, event_order)
) ON COMMIT DROP;

INSERT INTO manual_history_import_events (
  work_date,
  event_order,
  event_type,
  local_time,
  day_offset
)
VALUES
  ('2026-04-11', 1, 'clock_in', '14:00', 0),
  ('2026-04-11', 2, 'clock_out', '16:30', 0),
  ('2026-04-11', 3, 'clock_in', '20:00', 0),
  ('2026-04-11', 4, 'end_day', '00:00', 1),

  ('2026-04-12', 1, 'clock_in', '14:00', 0),
  ('2026-04-12', 2, 'end_day', '16:50', 0),

  ('2026-04-17', 1, 'clock_in', '14:00', 0),
  ('2026-04-17', 2, 'clock_out', '17:00', 0),
  ('2026-04-17', 3, 'clock_in', '20:00', 0),
  ('2026-04-17', 4, 'end_day', '23:30', 0),

  ('2026-04-18', 1, 'clock_in', '14:00', 0),
  ('2026-04-18', 2, 'clock_out', '16:30', 0),
  ('2026-04-18', 3, 'clock_in', '20:00', 0),
  ('2026-04-18', 4, 'end_day', '00:00', 1),

  ('2026-04-19', 1, 'clock_in', '14:00', 0),
  ('2026-04-19', 2, 'end_day', '18:00', 0),

  ('2026-04-24', 1, 'clock_in', '12:00', 0),
  ('2026-04-24', 2, 'clock_out', '16:45', 0),
  ('2026-04-24', 3, 'clock_in', '20:00', 0),
  ('2026-04-24', 4, 'end_day', '00:00', 1),

  ('2026-04-25', 1, 'clock_in', '14:00', 0),
  ('2026-04-25', 2, 'clock_out', '17:00', 0),
  ('2026-04-25', 3, 'clock_in', '20:00', 0),
  ('2026-04-25', 4, 'end_day', '23:45', 0),

  ('2026-04-26', 1, 'clock_in', '14:00', 0),
  ('2026-04-26', 2, 'end_day', '17:15', 0),

  ('2026-05-01', 1, 'clock_in', '14:00', 0),
  ('2026-05-01', 2, 'clock_out', '17:30', 0),
  ('2026-05-01', 3, 'clock_in', '20:00', 0),
  ('2026-05-01', 4, 'end_day', '23:45', 0),

  ('2026-05-02', 1, 'clock_in', '14:00', 0),
  ('2026-05-02', 2, 'clock_out', '16:30', 0),
  ('2026-05-02', 3, 'clock_in', '20:00', 0),
  ('2026-05-02', 4, 'end_day', '00:00', 1),

  ('2026-05-03', 1, 'clock_in', '14:00', 0),
  ('2026-05-03', 2, 'end_day', '18:00', 0),

  ('2026-05-08', 1, 'clock_in', '14:00', 0),
  ('2026-05-08', 2, 'clock_out', '17:00', 0),
  ('2026-05-08', 3, 'clock_in', '20:00', 0),
  ('2026-05-08', 4, 'end_day', '00:00', 1),

  ('2026-05-09', 1, 'clock_in', '14:00', 0),
  ('2026-05-09', 2, 'clock_out', '17:00', 0),
  ('2026-05-09', 3, 'clock_in', '20:00', 0),
  ('2026-05-09', 4, 'end_day', '23:30', 0),

  ('2026-05-10', 1, 'clock_in', '14:00', 0),
  ('2026-05-10', 2, 'end_day', '17:00', 0);

DO $$
DECLARE
  target_user_id UUID;
  target_employer_id UUID;
  duplicate_count INTEGER;
  invalid_day_count INTEGER;
  non_increasing_count INTEGER;
BEGIN
  SELECT id
  INTO target_user_id
  FROM users
  WHERE active = TRUE
    AND lower(name) = lower('Rosa');

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Active user not found: Rosa';
  END IF;

  SELECT id
  INTO target_employer_id
  FROM employers
  WHERE active = TRUE
    AND lower(name) = lower('Os Petiscos de Margarita');

  IF target_employer_id IS NULL THEN
    RAISE EXCEPTION 'Active employer not found: Os Petiscos de Margarita';
  END IF;

  SELECT count(*)
  INTO invalid_day_count
  FROM (
    SELECT
      work_date,
      (array_agg(event_type ORDER BY event_order))[1] AS first_event_type,
      (array_agg(event_type ORDER BY event_order DESC))[1] AS last_event_type
    FROM manual_history_import_events
    GROUP BY work_date
  ) AS imported_days
  WHERE first_event_type <> 'clock_in'
    OR last_event_type <> 'end_day';

  IF invalid_day_count > 0 THEN
    RAISE EXCEPTION 'Historical import contains days that do not start with clock_in and end with end_day.';
  END IF;

  SELECT count(*)
  INTO non_increasing_count
  FROM (
    SELECT
      work_date,
      event_order,
      ((work_date + day_offset) + local_time) AT TIME ZONE 'Europe/Madrid' AS occurred_at,
      lag(((work_date + day_offset) + local_time) AT TIME ZONE 'Europe/Madrid')
        OVER (PARTITION BY work_date ORDER BY event_order) AS previous_occurred_at
    FROM manual_history_import_events
  ) AS ordered_import_events
  WHERE previous_occurred_at IS NOT NULL
    AND occurred_at <= previous_occurred_at;

  IF non_increasing_count > 0 THEN
    RAISE EXCEPTION 'Historical import contains non-increasing event timestamps.';
  END IF;

  SELECT count(*)
  INTO duplicate_count
  FROM work_days
  WHERE user_id = target_user_id
    AND employer_id = target_employer_id
    AND work_date IN (
      SELECT DISTINCT work_date
      FROM manual_history_import_events
    );

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Historical import would duplicate % existing work_days rows.', duplicate_count;
  END IF;
END $$;

WITH target AS (
  SELECT
    users.id AS user_id,
    employers.id AS employer_id
  FROM users
  CROSS JOIN employers
  WHERE users.active = TRUE
    AND lower(users.name) = lower('Rosa')
    AND employers.active = TRUE
    AND lower(employers.name) = lower('Os Petiscos de Margarita')
),
normalized_events AS (
  SELECT
    manual_history_import_events.work_date,
    manual_history_import_events.event_order,
    manual_history_import_events.event_type,
    (
      (
        manual_history_import_events.work_date
        + manual_history_import_events.day_offset
      )
      + manual_history_import_events.local_time
    ) AT TIME ZONE 'Europe/Madrid' AS occurred_at
  FROM manual_history_import_events
),
day_bounds AS (
  SELECT
    work_date,
    min(occurred_at) FILTER (WHERE event_type = 'clock_in') AS started_at,
    max(occurred_at) FILTER (WHERE event_type = 'end_day') AS ended_at
  FROM normalized_events
  GROUP BY work_date
),
inserted_work_days AS (
  INSERT INTO work_days (
    user_id,
    employer_id,
    work_date,
    started_at,
    ended_at,
    status,
    last_event_type,
    last_event_at
  )
  SELECT
    target.user_id,
    target.employer_id,
    day_bounds.work_date,
    day_bounds.started_at,
    day_bounds.ended_at,
    'ended',
    'end_day',
    day_bounds.ended_at
  FROM day_bounds
  CROSS JOIN target
  ORDER BY day_bounds.work_date
  RETURNING id, user_id, employer_id, work_date, started_at, ended_at, status
),
inserted_events AS (
  INSERT INTO events (
    work_day_id,
    user_id,
    employer_id,
    type,
    occurred_at
  )
  SELECT
    inserted_work_days.id,
    inserted_work_days.user_id,
    inserted_work_days.employer_id,
    normalized_events.event_type,
    normalized_events.occurred_at
  FROM normalized_events
  JOIN inserted_work_days
    ON inserted_work_days.work_date = normalized_events.work_date
  ORDER BY normalized_events.work_date, normalized_events.event_order
  RETURNING work_day_id
)
SELECT
  inserted_work_days.work_date,
  inserted_work_days.status,
  inserted_work_days.started_at,
  inserted_work_days.ended_at,
  count(inserted_events.work_day_id) AS event_count
FROM inserted_work_days
JOIN inserted_events
  ON inserted_events.work_day_id = inserted_work_days.id
GROUP BY
  inserted_work_days.work_date,
  inserted_work_days.status,
  inserted_work_days.started_at,
  inserted_work_days.ended_at
ORDER BY inserted_work_days.work_date;

COMMIT;
