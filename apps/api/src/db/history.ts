import type { EventType, WorkDayStatus } from '@time-tracker/shared';
import { sql } from './client.js';

type HistoryInput = {
  userId: string;
  employerId: string;
  limit: number;
  fromDate?: string;
  toDate?: string;
};

export type HistoryItem = {
  id: string;
  userId: string;
  employerId: string;
  workDate: string;
  startedAt: Date;
  endedAt: Date | null;
  status: WorkDayStatus;
  lastEventType: EventType;
  lastEventAt: Date;
  totalWorkedSeconds: number;
  totalBreakSeconds: number;
};

export const listHistory = async (
  input: HistoryInput,
): Promise<HistoryItem[]> => {
  const fromDate = input.fromDate ?? null;
  const toDate = input.toDate ?? null;

  const rows = (await sql`
    WITH selected_work_days AS (
      SELECT *
      FROM work_days
      WHERE user_id = ${input.userId}::uuid
        AND employer_id = ${input.employerId}::uuid
        AND (${fromDate}::date IS NULL OR work_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR work_date <= ${toDate}::date)
      ORDER BY work_date DESC, started_at DESC
      LIMIT ${input.limit}
    ),
    ordered_events AS (
      SELECT
        events.*,
        lead(events.type) OVER (
          PARTITION BY events.work_day_id
          ORDER BY events.occurred_at, events.created_at
        ) AS next_type,
        lead(events.occurred_at) OVER (
          PARTITION BY events.work_day_id
          ORDER BY events.occurred_at, events.created_at
        ) AS next_occurred_at
      FROM events
      JOIN selected_work_days ON selected_work_days.id = events.work_day_id
    ),
    totals AS (
      SELECT
        work_day_id,
        coalesce(
          sum(
            CASE
              WHEN type = 'clock_in'
                AND next_type IN ('clock_out', 'end_day')
              THEN extract(epoch FROM next_occurred_at - occurred_at)
              ELSE 0
            END
          ),
          0
        )::int AS total_worked_seconds,
        coalesce(
          sum(
            CASE
              WHEN type = 'clock_out'
                AND next_type IN ('clock_in', 'end_day')
              THEN extract(epoch FROM next_occurred_at - occurred_at)
              ELSE 0
            END
          ),
          0
        )::int AS total_break_seconds
      FROM ordered_events
      GROUP BY work_day_id
    )
    SELECT
      selected_work_days.id,
      selected_work_days.user_id AS "userId",
      selected_work_days.employer_id AS "employerId",
      selected_work_days.work_date AS "workDate",
      selected_work_days.started_at AS "startedAt",
      selected_work_days.ended_at AS "endedAt",
      selected_work_days.status,
      selected_work_days.last_event_type AS "lastEventType",
      selected_work_days.last_event_at AS "lastEventAt",
      coalesce(totals.total_worked_seconds, 0) AS "totalWorkedSeconds",
      coalesce(totals.total_break_seconds, 0) AS "totalBreakSeconds"
    FROM selected_work_days
    LEFT JOIN totals ON totals.work_day_id = selected_work_days.id
    ORDER BY selected_work_days.work_date DESC, selected_work_days.started_at DESC
  `) as HistoryItem[];

  return rows;
};
