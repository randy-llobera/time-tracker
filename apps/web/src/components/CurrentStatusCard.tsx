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
};

const stateLabel: Record<CurrentStatus['state'], string> = {
  not_started: 'Not started',
  working: 'Working',
  on_break: 'On break',
  needs_review: 'Needs review',
};

export const CurrentStatusCard = ({
  status,
  isLoading,
  error,
  hasSelections,
  actionError,
  loadingAction,
  onAction,
}: CurrentStatusCardProps) => {
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

  return (
    <div className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
      <p className='text-sm font-medium text-slate-300'>Current status</p>
      <p className='mt-2 text-2xl font-bold text-slate-50'>
        {status ? stateLabel[status.state] : 'Unknown'}
      </p>
      {status?.workDay && (
        <p className='mt-2 text-sm text-slate-400'>
          Last update: {new Date(status.workDay.lastEventAt).toLocaleString()}
        </p>
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
