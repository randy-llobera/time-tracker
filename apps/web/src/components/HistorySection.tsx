import type { HistoryItem } from '../api/client';

type HistorySectionProps = {
  items: HistoryItem[];
  isLoading: boolean;
  error: string | null;
  hasSelections: boolean;
};

const statusLabel: Record<HistoryItem['status'], string> = {
  active: 'Active',
  ended: 'Ended',
  needs_review: 'Needs review',
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

export const HistorySection = ({
  items,
  isLoading,
  error,
  hasSelections,
}: HistorySectionProps) => {
  if (!hasSelections) {
    return (
      <section className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
        <h2 className='text-sm font-medium text-slate-300'>History</h2>
        <p className='mt-2 text-sm text-slate-400'>
          Select a user and employer to see work history.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
        <h2 className='text-sm font-medium text-slate-300'>History</h2>
        <p className='mt-2 text-sm text-slate-400'>Loading history...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className='mt-5 rounded-lg border border-red-900 bg-red-950/60 p-4'>
        <h2 className='text-sm font-medium text-red-100'>History</h2>
        <p className='mt-2 text-sm text-red-200'>
          Could not load history: {error}
        </p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
        <h2 className='text-sm font-medium text-slate-300'>History</h2>
        <p className='mt-2 text-sm text-slate-400'>No work history yet.</p>
      </section>
    );
  }

  return (
    <section className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
      <h2 className='text-sm font-medium text-slate-300'>History</h2>
      <div className='mt-4 space-y-3'>
        {items.map((item) => (
          <article
            className='rounded-lg border border-slate-800 bg-slate-900 p-4'
            key={item.id}
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-base font-semibold text-slate-50'>
                  {formatDate(item.workDate)}
                </p>
                <p className='mt-1 text-sm text-slate-400'>
                  {statusLabel[item.status]}
                </p>
              </div>
              <div className='text-right text-sm text-slate-300'>
                <p>{formatDuration(item.totalWorkedSeconds)}</p>
                <p className='text-slate-500'>worked</p>
              </div>
            </div>

            <dl className='mt-4 grid gap-3 text-sm text-slate-300'>
              <div className='flex justify-between gap-3'>
                <dt className='text-slate-500'>Started</dt>
                <dd className='text-right'>{formatDateTime(item.startedAt)}</dd>
              </div>
              <div className='flex justify-between gap-3'>
                <dt className='text-slate-500'>Ended</dt>
                <dd className='text-right'>
                  {item.endedAt ? formatDateTime(item.endedAt) : 'Not ended'}
                </dd>
              </div>
              <div className='flex justify-between gap-3'>
                <dt className='text-slate-500'>Breaks</dt>
                <dd className='text-right'>
                  {formatDuration(item.totalBreakSeconds)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
};
