import { useState } from 'react';
import type { CurrentStatus } from '../api/client';

export type ClockAction = 'clockIn' | 'clockOut' | 'endDay';

type CurrentStatusCardProps = {
  status: CurrentStatus | null;
  isLoading: boolean;
  error: string | null;
  hasSelections: boolean;
  actionError: string | null;
  loadingAction: ClockAction | null;
  onAction: (action: ClockAction) => void;
  isResolvingStale: boolean;
  onResolveStale: (occurredAt?: string) => void;
};

const stateLabel: Record<CurrentStatus['state'], string> = {
  not_started: 'Not started',
  working: 'Working',
  on_break: 'On break',
  needs_review: 'Needs review',
};

const padDatePart = (value: number) => value.toString().padStart(2, '0');

const formatLocalDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;

const formatDisplayDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minutes = Array.from({ length: 60 }, (_, index) => padDatePart(index));
const periods = ['AM', 'PM'] as const;

type Period = (typeof periods)[number];

const toLocalDate = ({
  date,
  hour,
  minute,
  period,
}: {
  date: string;
  hour: string;
  minute: string;
  period: Period;
}) => {
  const [year, month, day] = date.split('-').map(Number);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);

  if (!year || !month || !day || !hourNumber || Number.isNaN(minuteNumber)) {
    return null;
  }

  const normalizedHour =
    period === 'AM' ? hourNumber % 12 : (hourNumber % 12) + 12;

  return new Date(year, month - 1, day, normalizedHour, minuteNumber);
};

const getValidSelectedStopTime = ({
  date,
  hour,
  minute,
  period,
  minDate,
  maxDate,
}: {
  date: string;
  hour: string;
  minute: string;
  period: Period;
  minDate: Date | null;
  maxDate: Date;
}) => {
  if (!date || !hour || !minute || !minDate) {
    return null;
  }

  const selectedDate = toLocalDate({ date, hour, minute, period });

  if (!selectedDate || selectedDate <= minDate || selectedDate > maxDate) {
    return null;
  }

  return selectedDate;
};

const hasValidCandidate = ({
  date,
  hour,
  minute,
  period,
  minDate,
  maxDate,
}: {
  date: string;
  hour?: string;
  minute?: string;
  period?: Period;
  minDate: Date | null;
  maxDate: Date;
}) => {
  if (!date || !minDate) {
    return true;
  }

  const hoursToCheck = hour ? [hour] : hours;
  const minutesToCheck = minute ? [minute] : minutes;
  const periodsToCheck = period ? [period] : periods;

  return periodsToCheck.some((candidatePeriod) =>
    hoursToCheck.some((candidateHour) =>
      minutesToCheck.some((candidateMinute) => {
        const selectedDate = toLocalDate({
          date,
          hour: candidateHour,
          minute: candidateMinute,
          period: candidatePeriod,
        });

        return (
          selectedDate !== null &&
          selectedDate > minDate &&
          selectedDate <= maxDate
        );
      }),
    ),
  );
};

export const CurrentStatusCard = ({
  status,
  isLoading,
  error,
  hasSelections,
  actionError,
  loadingAction,
  onAction,
  isResolvingStale,
  onResolveStale,
}: CurrentStatusCardProps) => {
  const [staleStopDate, setStaleStopDate] = useState('');
  const [staleStopHour, setStaleStopHour] = useState('');
  const [staleStopMinute, setStaleStopMinute] = useState('');
  const [staleStopPeriod, setStaleStopPeriod] = useState<Period>('AM');

  if (!hasSelections) {
    return (
      <div className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
        <p className='text-sm font-medium text-slate-300'>Current status</p>
        <p className='mt-2 text-sm text-slate-400'>
          Select a user and employer to see today&apos;s status.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
        <p className='text-sm font-medium text-slate-300'>Current status</p>
        <p className='mt-2 text-sm text-slate-400'>Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mt-5 rounded-lg border border-red-900 bg-red-950/60 p-4'>
        <p className='text-sm font-medium text-red-100'>Current status</p>
        <p className='mt-2 text-sm text-red-200'>
          Could not load status: {error}
        </p>
      </div>
    );
  }

  const isActionLoading = loadingAction !== null;
  const staleLastEventType =
    status?.staleWarning?.lastEventType ?? status?.workDay?.lastEventType;
  const staleLastEventAt =
    status?.staleWarning?.lastEventAt ?? status?.workDay?.lastEventAt;
  const staleThresholdHours = status?.staleWarning?.thresholdHours;
  const minStopDate = staleLastEventAt ? new Date(staleLastEventAt) : null;
  const maxStopDate = new Date();
  const validSelectedStopTime = getValidSelectedStopTime({
    date: staleStopDate,
    hour: staleStopHour,
    minute: staleStopMinute,
    period: staleStopPeriod,
    minDate: minStopDate,
    maxDate: maxStopDate,
  });
  const hasCompleteStopTime = Boolean(
    staleStopDate && staleStopHour && staleStopMinute,
  );

  return (
    <div className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
      <p className='text-sm font-medium text-slate-300'>Current status</p>
      <p className='mt-2 text-2xl font-bold text-slate-50'>
        {status ? stateLabel[status.state] : 'Unknown'}
      </p>
      {status?.workDay && (
        <p className='mt-2 text-sm text-slate-400'>
          Last update: {formatDisplayDateTime(status.workDay.lastEventAt)}
        </p>
      )}

      {status?.state === 'needs_review' && (
        <div className='mt-5 rounded-lg border border-amber-700 bg-amber-950/60 p-4'>
          <p className='text-base font-semibold text-amber-100'>
            Current workday needs review
          </p>
          <p className='mt-2 text-sm text-amber-100'>
            Resolve the previous session before clocking in again.
          </p>

          {staleLastEventAt && (
            <dl className='mt-4 grid gap-2 text-sm text-amber-100'>
              {staleThresholdHours && (
                <div className='flex justify-between gap-3'>
                  <dt className='text-amber-300'>Review threshold</dt>
                  <dd className='text-right'>{staleThresholdHours}h</dd>
                </div>
              )}
              <div className='flex justify-between gap-3'>
                <dt className='text-amber-300'>Last action time</dt>
                <dd className='text-right'>
                  {formatDisplayDateTime(staleLastEventAt)}
                </dd>
              </div>
            </dl>
          )}

          {staleLastEventType === 'clock_out' && (
            <div className='mt-4 grid gap-3'>
              <p className='text-sm text-amber-100'>
                You clocked out but did not end the day. End the workday at
                your last clock-out time?
              </p>
              <button
                className='w-full rounded-lg bg-amber-300 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={isResolvingStale}
                type='button'
                onClick={() => onResolveStale()}
              >
                {isResolvingStale ? 'Resolving...' : 'End Workday'}
              </button>
            </div>
          )}

          {staleLastEventType === 'clock_in' && (
            <div className='mt-4 grid gap-3'>
              <p className='text-sm text-amber-100'>
                Last work session was not ended. Please choose the time you
                stopped working.
              </p>
              <label className='block'>
                <span className='text-sm font-medium text-amber-200'>Date</span>
                <input
                  className='mt-2 w-full rounded-lg border border-amber-700 bg-slate-950 px-3 py-3 text-base text-slate-50'
                  max={formatLocalDateInputValue(maxStopDate)}
                  min={
                    minStopDate
                      ? formatLocalDateInputValue(minStopDate)
                      : undefined
                  }
                  type='date'
                  value={staleStopDate}
                  onChange={(event) => setStaleStopDate(event.target.value)}
                />
              </label>
              <div className='grid grid-cols-3 gap-2'>
                <label className='block'>
                  <span className='text-sm font-medium text-amber-200'>
                    Hour
                  </span>
                  <select
                    className='mt-2 w-full rounded-lg border border-amber-700 bg-slate-950 px-3 py-3 text-base text-slate-50'
                    value={staleStopHour}
                    onChange={(event) => setStaleStopHour(event.target.value)}
                  >
                    <option value=''>Hour</option>
                    {hours.map((hour) => (
                      <option
                        disabled={
                          !hasValidCandidate({
                            date: staleStopDate,
                            hour,
                            minute: staleStopMinute || undefined,
                            period: staleStopPeriod,
                            minDate: minStopDate,
                            maxDate: maxStopDate,
                          })
                        }
                        key={hour}
                        value={hour}
                      >
                        {hour}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='block'>
                  <span className='text-sm font-medium text-amber-200'>
                    Minute
                  </span>
                  <select
                    className='mt-2 w-full rounded-lg border border-amber-700 bg-slate-950 px-3 py-3 text-base text-slate-50'
                    value={staleStopMinute}
                    onChange={(event) => setStaleStopMinute(event.target.value)}
                  >
                    <option value=''>Min</option>
                    {minutes.map((minute) => (
                      <option
                        disabled={
                          !hasValidCandidate({
                            date: staleStopDate,
                            hour: staleStopHour || undefined,
                            minute,
                            period: staleStopPeriod,
                            minDate: minStopDate,
                            maxDate: maxStopDate,
                          })
                        }
                        key={minute}
                        value={minute}
                      >
                        {minute}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='block'>
                  <span className='text-sm font-medium text-amber-200'>
                    AM/PM
                  </span>
                  <select
                    className='mt-2 w-full rounded-lg border border-amber-700 bg-slate-950 px-3 py-3 text-base text-slate-50'
                    value={staleStopPeriod}
                    onChange={(event) =>
                      setStaleStopPeriod(event.target.value as Period)
                    }
                  >
                    {periods.map((period) => (
                      <option
                        disabled={
                          !hasValidCandidate({
                            date: staleStopDate,
                            hour: staleStopHour || undefined,
                            minute: staleStopMinute || undefined,
                            period,
                            minDate: minStopDate,
                            maxDate: maxStopDate,
                          })
                        }
                        key={period}
                        value={period}
                      >
                        {period}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {hasCompleteStopTime && !validSelectedStopTime && (
                <p className='text-sm text-amber-200'>
                  Choose a time after the last clock-in and no later than now.
                </p>
              )}
              <button
                className='w-full rounded-lg bg-amber-300 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={isResolvingStale || !validSelectedStopTime}
                type='button'
                onClick={() =>
                  validSelectedStopTime &&
                  onResolveStale(validSelectedStopTime.toISOString())
                }
              >
                {isResolvingStale ? 'Resolving...' : 'Save Stop Time'}
              </button>
            </div>
          )}

          {staleLastEventType !== 'clock_in' &&
            staleLastEventType !== 'clock_out' && (
              <p className='mt-4 text-sm text-amber-200'>
                Correction is not available yet. This record needs manual
                review.
              </p>
            )}
        </div>
      )}

      {actionError && (
        <p className='mt-4 rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200'>
          {actionError}
        </p>
      )}

      {status?.state === 'not_started' && (
        <button
          className='mt-5 w-full rounded-lg bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60'
          disabled={isActionLoading}
          type='button'
          onClick={() => onAction('clockIn')}
        >
          {loadingAction === 'clockIn' ? 'Clocking in...' : 'Clock In'}
        </button>
      )}

      {status?.state === 'working' && (
        <div className='mt-5 grid gap-3'>
          <button
            className='w-full rounded-lg bg-sky-500 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isActionLoading}
            type='button'
            onClick={() => onAction('clockOut')}
          >
            {loadingAction === 'clockOut' ? 'Clocking out...' : 'Clock Out'}
          </button>
          <button
            className='w-full rounded-lg border border-slate-700 px-4 py-3 text-base font-semibold text-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isActionLoading}
            type='button'
            onClick={() => onAction('endDay')}
          >
            {loadingAction === 'endDay' ? 'Ending day...' : 'End Day'}
          </button>
        </div>
      )}

      {status?.state === 'on_break' && (
        <div className='mt-5 grid gap-3'>
          <button
            className='w-full rounded-lg bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isActionLoading}
            type='button'
            onClick={() => onAction('clockIn')}
          >
            {loadingAction === 'clockIn' ? 'Clocking in...' : 'Clock In'}
          </button>
          <button
            className='w-full rounded-lg border border-slate-700 px-4 py-3 text-base font-semibold text-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            disabled={isActionLoading}
            type='button'
            onClick={() => onAction('endDay')}
          >
            {loadingAction === 'endDay' ? 'Ending day...' : 'End Day'}
          </button>
        </div>
      )}
    </div>
  );
};
