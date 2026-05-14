import type {
  CurrentState,
  EventType,
  WorkDayStatus,
} from '@time-tracker/shared';
import { sql } from './client.js';

const CLOCKED_IN_REVIEW_THRESHOLD_HOURS = 14;
const CLOCKED_OUT_REVIEW_THRESHOLD_HOURS = 8;

type StatusInput = {
  userId: string;
  employerId: string;
};

type StatusRow = {
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

export type StaleWarning = {
  reason:
    | 'clocked_in_too_long'
    | 'clocked_out_without_ending_day';
  thresholdHours: number;
  lastEventType: EventType;
  lastEventAt: Date;
};

export type CurrentStatus = {
  state: CurrentState;
  workDay: StatusRow | null;
  staleWarning: StaleWarning | null;
};

const toCurrentState = (workDay: StatusRow | undefined): CurrentState => {
  if (!workDay) {
    return 'not_started';
  }

  if (workDay.status === 'needs_review') {
    return 'needs_review';
  }

  if (workDay.lastEventType === 'clock_in') {
    return 'working';
  }

  return 'on_break';
};

const getStaleWarning = (workDay: StatusRow | null): StaleWarning | null => {
  if (workDay?.status !== 'needs_review') {
    return null;
  }

  if (workDay.lastEventType === 'clock_in') {
    return {
      reason: 'clocked_in_too_long',
      thresholdHours: CLOCKED_IN_REVIEW_THRESHOLD_HOURS,
      lastEventType: workDay.lastEventType,
      lastEventAt: workDay.lastEventAt,
    };
  }

  if (workDay.lastEventType === 'clock_out') {
    return {
      reason: 'clocked_out_without_ending_day',
      thresholdHours: CLOCKED_OUT_REVIEW_THRESHOLD_HOURS,
      lastEventType: workDay.lastEventType,
      lastEventAt: workDay.lastEventAt,
    };
  }

  return null;
};

export const getCurrentStatus = async (
  input: StatusInput,
): Promise<CurrentStatus> => {
  const rows = (await sql`
    WITH current_day AS (
      SELECT *
      FROM work_days
      WHERE user_id = ${input.userId}::uuid
        AND employer_id = ${input.employerId}::uuid
        AND status IN ('active', 'needs_review')
      ORDER BY
        CASE WHEN status = 'needs_review' THEN 0 ELSE 1 END,
        started_at DESC
      LIMIT 1
    ),
    stale_day AS (
      UPDATE work_days
      SET
        status = 'needs_review',
        updated_at = now()
      FROM current_day
      WHERE work_days.id = current_day.id
        AND current_day.status = 'active'
        AND (
          (
            current_day.last_event_type = 'clock_in'
            AND current_day.last_event_at <= now() - make_interval(hours => ${CLOCKED_IN_REVIEW_THRESHOLD_HOURS}::int)
          )
          OR
          (
            current_day.last_event_type = 'clock_out'
            AND current_day.last_event_at <= now() - make_interval(hours => ${CLOCKED_OUT_REVIEW_THRESHOLD_HOURS}::int)
          )
        )
      RETURNING work_days.*
    ),
    result_day AS (
      SELECT * FROM stale_day
      UNION ALL
      SELECT current_day.*
      FROM current_day
      WHERE NOT EXISTS (SELECT 1 FROM stale_day)
    )
    SELECT
      id,
      user_id AS "userId",
      employer_id AS "employerId",
      work_date AS "workDate",
      started_at AS "startedAt",
      ended_at AS "endedAt",
      status,
      last_event_type AS "lastEventType",
      last_event_at AS "lastEventAt"
    FROM result_day
  `) as StatusRow[];

  const workDay = rows[0] ?? null;

  return {
    state: toCurrentState(workDay ?? undefined),
    workDay,
    staleWarning: getStaleWarning(workDay),
  };
};
