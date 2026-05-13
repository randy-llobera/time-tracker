import type {
  CurrentState,
  EventType,
  WorkDayStatus,
} from '@time-tracker/shared';
import { sql } from './client.js';

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

export type CurrentStatus = {
  state: CurrentState;
  workDay: StatusRow | null;
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

export const getCurrentStatus = async (
  input: StatusInput,
): Promise<CurrentStatus> => {
  const rows = (await sql`
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
    FROM work_days
    WHERE user_id = ${input.userId}::uuid
      AND employer_id = ${input.employerId}::uuid
      AND status IN ('active', 'needs_review')
    ORDER BY started_at DESC
    LIMIT 1
  `) as StatusRow[];

  const workDay = rows[0] ?? null;

  return {
    state: toCurrentState(workDay ?? undefined),
    workDay,
  };
};
