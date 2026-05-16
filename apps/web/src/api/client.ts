import type {
  CurrentState,
  EventType,
  WorkDayStatus,
} from '@time-tracker/shared';

export type SelectOption = {
  id: string;
  name: string;
};

export type StaleWarning = {
  reason:
    | 'clocked_in_too_long'
    | 'clocked_out_without_ending_day';
  thresholdHours: number;
  lastEventType: EventType;
  lastEventAt: string;
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
  staleWarning: StaleWarning | null;
};

export type HistoryItem = {
  id: string;
  userId: string;
  employerId: string;
  workDate: string;
  startedAt: string;
  endedAt: string | null;
  status: WorkDayStatus;
  lastEventType: EventType;
  lastEventAt: string;
  totalWorkedSeconds: number;
  totalBreakSeconds: number;
};

type HistoryResponse = {
  items: HistoryItem[];
};

export type HistoryFilterInput =
  | {
      period: 'current_week' | 'current_month';
      today: string;
    }
  | {
      period: 'range';
      from: string;
      to: string;
    };

type StatusInput = {
  userId: string;
  employerId: string;
};

type HistoryInput = StatusInput & {
  filter: HistoryFilterInput;
};

type EventActionInput = StatusInput;

type ResolveStaleDayInput = StatusInput & {
  occurredAt?: string;
};

const apiErrorMessages: Record<string, string> = {
  'Already clocked in.': 'Ya fichaste entrada.',
  'Cannot clock out while already on break.':
    'No puedes fichar descanso si ya estás en descanso.',
  'Cannot resolve this work day. Check the selected stop time and try again.':
    'No se puede resolver esta jornada. Revisa la hora seleccionada e inténtalo de nuevo.',
  'Invalid download request.': 'La solicitud de descarga no es válida.',
  'Invalid event request.': 'La solicitud de fichaje no es válida.',
  'Invalid history request.': 'La solicitud de historial no es válida.',
  'Invalid status request.': 'La solicitud de estado no es válida.',
  'Work day has already finished.': 'La jornada ya terminó.',
};

const getExportFilename = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();

  return `work-time-export-${day}${month}${year}.csv`;
};

const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  if (!baseUrl) {
    throw new Error('VITE_API_BASE_URL no está configurada');
  }

  return baseUrl.replace(/\/$/, '');
};

const getApiErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { error?: unknown };

    if (typeof data.error === 'string') {
      return apiErrorMessages[data.error] ?? data.error;
    }
  } catch {
    // Fall back to the status code below when the API does not return JSON.
  }

  return `La API respondió con ${response.status}`;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`);

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return (await response.json()) as T;
};

const fetchBlob = async (path: string): Promise<Blob> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`);

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.blob();
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

const buildHistorySearchParams = ({
  userId,
  employerId,
  filter,
}: HistoryInput) => {
  const searchParams = new URLSearchParams({
    userId,
    employerId,
    period: filter.period,
  });

  if (filter.period === 'range') {
    searchParams.set('from', filter.from);
    searchParams.set('to', filter.to);
  } else {
    searchParams.set('today', filter.today);
  }

  return searchParams;
};

export const fetchHistory = (input: HistoryInput) => {
  const searchParams = buildHistorySearchParams(input);

  return fetchJson<HistoryResponse>(`/api/history?${searchParams.toString()}`);
};

export const downloadHistoryCsv = async (input: HistoryInput) => {
  const searchParams = buildHistorySearchParams(input);
  const blob = await fetchBlob(`/api/download?${searchParams.toString()}`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getExportFilename();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const clockIn = (input: EventActionInput) =>
  postJson<unknown>('/api/events/clock-in', input);

export const clockOut = (input: EventActionInput) =>
  postJson<unknown>('/api/events/clock-out', input);

export const endDay = (input: EventActionInput) =>
  postJson<unknown>('/api/events/end-day', input);

export const resolveStaleDay = (input: ResolveStaleDayInput) =>
  postJson<unknown>('/api/events/resolve-stale-day', input);
