import type {
  CurrentState,
  EventType,
  WorkDayStatus,
} from '@time-tracker/shared';

export type SelectOption = {
  id: string;
  name: string;
};

export type CurrentStatus = {
  state: CurrentState;
  workDay: {
    id: string;
    userId: string;
    employerId: string;
    workDate: string;
    startedAt: string;
    endedAt: string | null;
    status: WorkDayStatus;
    lastEventType: EventType;
    lastEventAt: string;
  } | null;
};

type StatusInput = {
  userId: string;
  employerId: string;
};

type EventActionInput = StatusInput;

const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  return baseUrl.replace(/\/$/, '');
};

const getApiErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { error?: unknown };

    if (typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // Fall back to the status code below when the API does not return JSON.
  }

  return `API responded with ${response.status}`;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`);

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return (await response.json()) as T;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const fetchUsers = () => fetchJson<SelectOption[]>('/api/users');

export const fetchEmployers = () =>
  fetchJson<SelectOption[]>('/api/employers');

export const fetchStatus = ({ userId, employerId }: StatusInput) => {
  const searchParams = new URLSearchParams({
    userId,
    employerId,
  });

  return fetchJson<CurrentStatus>(`/api/status?${searchParams.toString()}`);
};

export const clockIn = (input: EventActionInput) =>
  postJson<unknown>('/api/events/clock-in', input);

export const clockOut = (input: EventActionInput) =>
  postJson<unknown>('/api/events/clock-out', input);

export const endDay = (input: EventActionInput) =>
  postJson<unknown>('/api/events/end-day', input);
