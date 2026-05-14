import type { HistoryItem } from '../api/client';

type HistorySectionProps = {
  items: HistoryItem[];
  isLoading: boolean;
  error: string | null;
  validationError: string | null;
  hasSelections: boolean;
  filterMode: HistoryFilterMode;
  selectedMonth: string;
  rangeFrom: string;
  rangeTo: string;
  onFilterModeChange: (value: HistoryFilterMode) => void;
  onSelectedMonthChange: (value: string) => void;
  onRangeFromChange: (value: string) => void;
  onRangeToChange: (value: string) => void;
};

type HistoryFilterMode = 'current_week' | 'current_month' | 'month' | 'range';

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
    hour12: true,
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

const inputClassName =
  'mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base text-slate-50';

type HistoryFilterControlsProps = {
  filterMode: HistoryFilterMode;
  selectedMonth: string;
  rangeFrom: string;
  rangeTo: string;
  onFilterModeChange: (value: HistoryFilterMode) => void;
  onSelectedMonthChange: (value: string) => void;
  onRangeFromChange: (value: string) => void;
  onRangeToChange: (value: string) => void;
};

const HistoryFilterControls = ({
  filterMode,
  selectedMonth,
  rangeFrom,
  rangeTo,
  onFilterModeChange,
  onSelectedMonthChange,
  onRangeFromChange,
  onRangeToChange,
}: HistoryFilterControlsProps) => (
  <div className='mt-4 space-y-3'>
    <label className='block'>
      <span className='text-sm font-medium text-slate-300'>Filter</span>
      <select
        className={inputClassName}
        value={filterMode}
        onChange={(event) =>
          onFilterModeChange(event.target.value as HistoryFilterMode)
        }
      >
        <option value='current_month'>Current month</option>
        <option value='current_week'>Current week</option>
        <option value='month'>Month</option>
        <option value='range'>Range</option>
      </select>
    </label>

    {filterMode === 'month' && (
      <label className='block'>
        <span className='text-sm font-medium text-slate-300'>Month</span>
        <input
          className={inputClassName}
          type='month'
          value={selectedMonth}
          onChange={(event) => onSelectedMonthChange(event.target.value)}
        />
      </label>
    )}

    {filterMode === 'range' && (
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='block'>
          <span className='text-sm font-medium text-slate-300'>From</span>
          <input
            className={inputClassName}
            type='date'
            value={rangeFrom}
            onChange={(event) => onRangeFromChange(event.target.value)}
          />
        </label>
        <label className='block'>
          <span className='text-sm font-medium text-slate-300'>To</span>
          <input
            className={inputClassName}
            type='date'
            value={rangeTo}
            onChange={(event) => onRangeToChange(event.target.value)}
          />
        </label>
      </div>
    )}
  </div>
);

export const HistorySection = ({
  items,
  isLoading,
  error,
  validationError,
  hasSelections,
  filterMode,
  selectedMonth,
  rangeFrom,
  rangeTo,
  onFilterModeChange,
  onSelectedMonthChange,
  onRangeFromChange,
  onRangeToChange,
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

  const controls = (
    <HistoryFilterControls
      filterMode={filterMode}
      selectedMonth={selectedMonth}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      onFilterModeChange={onFilterModeChange}
      onSelectedMonthChange={onSelectedMonthChange}
      onRangeFromChange={onRangeFromChange}
      onRangeToChange={onRangeToChange}
    />
  );

  const renderContent = () => {
    if (validationError) {
      return (
        <p className='mt-4 text-sm text-amber-200'>{validationError}</p>
      );
    }

    if (isLoading) {
      return (
        <p className='mt-4 text-sm text-slate-400'>Loading history...</p>
      );
    }

    if (error) {
      return (
        <p className='mt-4 text-sm text-red-200'>
          Could not load history: {error}
        </p>
      );
    }

    if (items.length === 0) {
      return (
        <p className='mt-4 text-sm text-slate-400'>No work history yet.</p>
      );
    }

    return (
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
    );
  };

  return (
    <section className='mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4'>
      <h2 className='text-sm font-medium text-slate-300'>History</h2>
      {controls}
      {renderContent()}
    </section>
  );
};
