export type EventType = 'clock_in' | 'clock_out' | 'end_day';

export type WorkDayStatus = 'active' | 'ended' | 'needs_review';

export type CurrentState =
  | 'not_started'
  | 'working'
  | 'on_break'
  | 'needs_review';
