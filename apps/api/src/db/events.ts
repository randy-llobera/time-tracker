import type { EventType, WorkDayStatus } from '@time-tracker/shared';
import { sql } from './client.js';

export class EventActionError extends Error {
  constructor(
    message: string,
    public statusCode = 409,
  ) {
    super(message);
  }
}

type EventActionInput = {
  userId: string;
  employerId: string;
};

type ResolveStaleDayInput = EventActionInput & {
  occurredAt?: Date;
};

type EventActionRow = {
  eventId: string;
  workDayId: string;
  userId: string;
  employerId: string;
  eventType: EventType;
  occurredAt: Date;
  eventCreatedAt: Date;
  workDate: string;
  startedAt: Date;
  endedAt: Date | null;
  status: WorkDayStatus;
  lastEventType: EventType;
  lastEventAt: Date;
};

export type EventActionResult = {
  event: {
    id: string;
    workDayId: string;
    userId: string;
    employerId: string;
    type: EventType;
    occurredAt: Date;
    createdAt: Date;
  };
  workDay: {
    id: string;
    userId: string;
    employerId: string;
    workDate: string;
    startedAt: Date;
    endedAt: Date | null;
    status: WorkDayStatus;
    lastEventType: EventType;
    lastEventAt: Date;
  };
};

const toEventActionResult = (
  rows: EventActionRow[],
  errorMessage: string,
): EventActionResult => {
  const row = rows[0];

  if (!row) {
    throw new EventActionError(errorMessage);
  }

  return {
    event: {
      id: row.eventId,
      workDayId: row.workDayId,
      userId: row.userId,
      employerId: row.employerId,
      type: row.eventType,
      occurredAt: row.occurredAt,
      createdAt: row.eventCreatedAt,
    },
    workDay: {
      id: row.workDayId,
      userId: row.userId,
      employerId: row.employerId,
      workDate: row.workDate,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      status: row.status,
      lastEventType: row.lastEventType,
      lastEventAt: row.lastEventAt,
    },
  };
};

export const clockIn = async (
  input: EventActionInput,
): Promise<EventActionResult> => {
  const rows = (await sql`
    WITH input AS (
      SELECT
        ${input.userId}::uuid AS user_id,
        ${input.employerId}::uuid AS employer_id,
        now() AS occurred_at
    ),
    eligible_input AS (
      SELECT input.*
      FROM input
      JOIN users ON users.id = input.user_id AND users.active = TRUE
      JOIN employers ON employers.id = input.employer_id AND employers.active = TRUE
    ),
    open_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN eligible_input
        ON eligible_input.user_id = work_days.user_id
        AND eligible_input.employer_id = work_days.employer_id
      WHERE work_days.status IN ('active', 'needs_review')
      ORDER BY
        CASE WHEN work_days.status = 'needs_review' THEN 0 ELSE 1 END,
        work_days.started_at DESC
      LIMIT 1
    ),
    active_day AS (
      SELECT *
      FROM open_day
      WHERE status = 'active'
      LIMIT 1
    ),
    created_day AS (
      INSERT INTO work_days (
        user_id,
        employer_id,
        work_date,
        started_at,
        status,
        last_event_type,
        last_event_at
      )
      SELECT
        eligible_input.user_id,
        eligible_input.employer_id,
        eligible_input.occurred_at::date,
        eligible_input.occurred_at,
        'active',
        'clock_in',
        eligible_input.occurred_at
      FROM eligible_input
      WHERE NOT EXISTS (SELECT 1 FROM open_day)
      RETURNING *
    ),
    target_day AS (
      SELECT * FROM created_day
      UNION ALL
      SELECT active_day.*
      FROM active_day
      WHERE active_day.last_event_type = 'clock_out'
    ),
    inserted_event AS (
      INSERT INTO events (
        work_day_id,
        user_id,
        employer_id,
        type,
        occurred_at
      )
      SELECT
        target_day.id,
        target_day.user_id,
        target_day.employer_id,
        'clock_in',
        input.occurred_at
      FROM target_day
      CROSS JOIN input
      RETURNING *
    ),
    updated_day AS (
      UPDATE work_days
      SET
        last_event_type = 'clock_in',
        last_event_at = input.occurred_at,
        updated_at = now()
      FROM active_day
      CROSS JOIN input
      WHERE work_days.id = active_day.id
        AND active_day.last_event_type = 'clock_out'
      RETURNING work_days.*
    ),
    result_day AS (
      SELECT * FROM created_day
      UNION ALL
      SELECT * FROM updated_day
    )
    SELECT
      inserted_event.id AS "eventId",
      result_day.id AS "workDayId",
      result_day.user_id AS "userId",
      result_day.employer_id AS "employerId",
      inserted_event.type AS "eventType",
      inserted_event.occurred_at AS "occurredAt",
      inserted_event.created_at AS "eventCreatedAt",
      result_day.work_date AS "workDate",
      result_day.started_at AS "startedAt",
      result_day.ended_at AS "endedAt",
      result_day.status,
      result_day.last_event_type AS "lastEventType",
      result_day.last_event_at AS "lastEventAt"
    FROM inserted_event
    JOIN result_day ON result_day.id = inserted_event.work_day_id
  `) as EventActionRow[];

  return toEventActionResult(
    rows,
    'Already clocked in.',
  );
};

export const clockOut = async (
  input: EventActionInput,
): Promise<EventActionResult> => {
  const rows = (await sql`
    WITH input AS (
      SELECT
        ${input.userId}::uuid AS user_id,
        ${input.employerId}::uuid AS employer_id,
        now() AS occurred_at
    ),
    review_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN users ON users.id = work_days.user_id AND users.active = TRUE
      JOIN employers ON employers.id = work_days.employer_id AND employers.active = TRUE
      JOIN input
        ON input.user_id = work_days.user_id
        AND input.employer_id = work_days.employer_id
      WHERE work_days.status = 'needs_review'
      LIMIT 1
    ),
    active_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN users ON users.id = work_days.user_id AND users.active = TRUE
      JOIN employers ON employers.id = work_days.employer_id AND employers.active = TRUE
      JOIN input
        ON input.user_id = work_days.user_id
        AND input.employer_id = work_days.employer_id
      WHERE work_days.status = 'active'
        AND work_days.last_event_type = 'clock_in'
        AND NOT EXISTS (SELECT 1 FROM review_day)
      LIMIT 1
    ),
    inserted_event AS (
      INSERT INTO events (
        work_day_id,
        user_id,
        employer_id,
        type,
        occurred_at
      )
      SELECT
        active_day.id,
        active_day.user_id,
        active_day.employer_id,
        'clock_out',
        input.occurred_at
      FROM active_day
      CROSS JOIN input
      RETURNING *
    ),
    updated_day AS (
      UPDATE work_days
      SET
        last_event_type = 'clock_out',
        last_event_at = input.occurred_at,
        updated_at = now()
      FROM active_day
      CROSS JOIN input
      WHERE work_days.id = active_day.id
      RETURNING work_days.*
    )
    SELECT
      inserted_event.id AS "eventId",
      updated_day.id AS "workDayId",
      updated_day.user_id AS "userId",
      updated_day.employer_id AS "employerId",
      inserted_event.type AS "eventType",
      inserted_event.occurred_at AS "occurredAt",
      inserted_event.created_at AS "eventCreatedAt",
      updated_day.work_date AS "workDate",
      updated_day.started_at AS "startedAt",
      updated_day.ended_at AS "endedAt",
      updated_day.status,
      updated_day.last_event_type AS "lastEventType",
      updated_day.last_event_at AS "lastEventAt"
    FROM inserted_event
    JOIN updated_day ON updated_day.id = inserted_event.work_day_id
  `) as EventActionRow[];

  return toEventActionResult(
    rows,
    'Cannot clock out while already on break.',
  );
};

export const endDay = async (
  input: EventActionInput,
): Promise<EventActionResult> => {
  const rows = (await sql`
    WITH input AS (
      SELECT
        ${input.userId}::uuid AS user_id,
        ${input.employerId}::uuid AS employer_id,
        now() AS occurred_at
    ),
    review_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN users ON users.id = work_days.user_id AND users.active = TRUE
      JOIN employers ON employers.id = work_days.employer_id AND employers.active = TRUE
      JOIN input
        ON input.user_id = work_days.user_id
        AND input.employer_id = work_days.employer_id
      WHERE work_days.status = 'needs_review'
      LIMIT 1
    ),
    active_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN users ON users.id = work_days.user_id AND users.active = TRUE
      JOIN employers ON employers.id = work_days.employer_id AND employers.active = TRUE
      JOIN input
        ON input.user_id = work_days.user_id
        AND input.employer_id = work_days.employer_id
      WHERE work_days.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM review_day)
      LIMIT 1
    ),
    inserted_event AS (
      INSERT INTO events (
        work_day_id,
        user_id,
        employer_id,
        type,
        occurred_at
      )
      SELECT
        active_day.id,
        active_day.user_id,
        active_day.employer_id,
        'end_day',
        input.occurred_at
      FROM active_day
      CROSS JOIN input
      RETURNING *
    ),
    updated_day AS (
      UPDATE work_days
      SET
        ended_at = input.occurred_at,
        status = 'ended',
        last_event_type = 'end_day',
        last_event_at = input.occurred_at,
        updated_at = now()
      FROM active_day
      CROSS JOIN input
      WHERE work_days.id = active_day.id
      RETURNING work_days.*
    )
    SELECT
      inserted_event.id AS "eventId",
      updated_day.id AS "workDayId",
      updated_day.user_id AS "userId",
      updated_day.employer_id AS "employerId",
      inserted_event.type AS "eventType",
      inserted_event.occurred_at AS "occurredAt",
      inserted_event.created_at AS "eventCreatedAt",
      updated_day.work_date AS "workDate",
      updated_day.started_at AS "startedAt",
      updated_day.ended_at AS "endedAt",
      updated_day.status,
      updated_day.last_event_type AS "lastEventType",
      updated_day.last_event_at AS "lastEventAt"
    FROM inserted_event
    JOIN updated_day ON updated_day.id = inserted_event.work_day_id
  `) as EventActionRow[];

  return toEventActionResult(
    rows,
    'Work day has already finished.',
  );
};

export const resolveStaleDay = async (
  input: ResolveStaleDayInput,
): Promise<EventActionResult> => {
  const selectedOccurredAt = input.occurredAt?.toISOString() ?? null;
  const rows = (await sql`
    WITH input AS (
      SELECT
        ${input.userId}::uuid AS user_id,
        ${input.employerId}::uuid AS employer_id,
        ${selectedOccurredAt}::timestamptz AS selected_occurred_at,
        now() AS requested_at
    ),
    review_day AS (
      SELECT work_days.*
      FROM work_days
      JOIN users ON users.id = work_days.user_id AND users.active = TRUE
      JOIN employers ON employers.id = work_days.employer_id AND employers.active = TRUE
      JOIN input
        ON input.user_id = work_days.user_id
        AND input.employer_id = work_days.employer_id
      WHERE work_days.status = 'needs_review'
        AND work_days.last_event_type IN ('clock_in', 'clock_out')
      LIMIT 1
    ),
    valid_day AS (
      SELECT
        review_day.*,
        CASE
          WHEN review_day.last_event_type = 'clock_out'
          THEN review_day.last_event_at
          ELSE input.selected_occurred_at
        END AS resolved_at
      FROM review_day
      CROSS JOIN input
      WHERE review_day.last_event_type = 'clock_out'
        OR (
          review_day.last_event_type = 'clock_in'
          AND input.selected_occurred_at IS NOT NULL
          AND input.selected_occurred_at > review_day.last_event_at
          AND input.selected_occurred_at <= input.requested_at
        )
    ),
    inserted_event AS (
      INSERT INTO events (
        work_day_id,
        user_id,
        employer_id,
        type,
        occurred_at
      )
      SELECT
        valid_day.id,
        valid_day.user_id,
        valid_day.employer_id,
        'end_day',
        valid_day.resolved_at
      FROM valid_day
      RETURNING *
    ),
    updated_day AS (
      UPDATE work_days
      SET
        ended_at = valid_day.resolved_at,
        status = 'ended',
        last_event_type = 'end_day',
        last_event_at = valid_day.resolved_at,
        updated_at = now()
      FROM valid_day
      WHERE work_days.id = valid_day.id
      RETURNING work_days.*
    )
    SELECT
      inserted_event.id AS "eventId",
      updated_day.id AS "workDayId",
      updated_day.user_id AS "userId",
      updated_day.employer_id AS "employerId",
      inserted_event.type AS "eventType",
      inserted_event.occurred_at AS "occurredAt",
      inserted_event.created_at AS "eventCreatedAt",
      updated_day.work_date AS "workDate",
      updated_day.started_at AS "startedAt",
      updated_day.ended_at AS "endedAt",
      updated_day.status,
      updated_day.last_event_type AS "lastEventType",
      updated_day.last_event_at AS "lastEventAt"
    FROM inserted_event
    JOIN updated_day ON updated_day.id = inserted_event.work_day_id
  `) as EventActionRow[];

  return toEventActionResult(
    rows,
    'Cannot resolve this work day. Check the selected stop time and try again.',
  );
};
