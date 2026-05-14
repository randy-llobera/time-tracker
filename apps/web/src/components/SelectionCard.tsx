import { useEffect, useState } from 'react';
import {
  clockIn,
  clockOut,
  downloadHistoryCsv,
  endDay,
  fetchEmployers,
  fetchHistory,
  fetchStatus,
  fetchUsers,
  resolveStaleDay,
  type CurrentStatus,
  type HistoryFilterInput,
  type HistoryItem,
  type SelectOption,
} from '../api/client';
import {
  CurrentStatusCard,
  type ClockAction,
} from './CurrentStatusCard';
import { HistorySection } from './HistorySection';
import { SelectField } from './SelectField';

const selectedUserIdKey = 'selectedUserId';
const selectedEmployerIdKey = 'selectedEmployerId';

type HistoryFilterMode = 'current_week' | 'current_month' | 'month' | 'range';

type ActiveHistoryFilterResult =
  | { filter: HistoryFilterInput; validationError: null }
  | {
      filter: null;
      validationError: string;
    };

const padDatePart = (value: number) => value.toString().padStart(2, '0');

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate(),
  )}`;

const getCurrentMonthValue = () => formatLocalDate(new Date()).slice(0, 7);

const getMonthDateRange = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);

  if (!year || !monthNumber) {
    return null;
  }

  return {
    from: `${month}-01`,
    to: formatLocalDate(new Date(year, monthNumber, 0)),
  };
};

const getActiveHistoryFilter = ({
  filterMode,
  selectedMonth,
  rangeFrom,
  rangeTo,
}: {
  filterMode: HistoryFilterMode;
  selectedMonth: string;
  rangeFrom: string;
  rangeTo: string;
}): ActiveHistoryFilterResult => {
  if (filterMode === 'current_week' || filterMode === 'current_month') {
    return {
      filter: {
        period: filterMode,
        today: formatLocalDate(new Date()),
      },
      validationError: null,
    };
  }

  if (filterMode === 'month') {
    const dateRange = getMonthDateRange(selectedMonth);

    if (!dateRange) {
      return {
        filter: null,
        validationError: 'Select a month to load history.',
      };
    }

    return {
      filter: {
        period: 'range',
        ...dateRange,
      },
      validationError: null,
    };
  }

  if (!rangeFrom || !rangeTo) {
    return {
      filter: null,
      validationError: 'Select both from and to dates to load history.',
    };
  }

  if (rangeFrom > rangeTo) {
    return {
      filter: null,
      validationError: 'From date must be before or equal to to date.',
    };
  }

  return {
    filter: {
      period: 'range',
      from: rangeFrom,
      to: rangeTo,
    },
    validationError: null,
  };
};

export const SelectionCard = () => {
  const defaultMonth = getCurrentMonthValue();
  const defaultMonthRange = getMonthDateRange(defaultMonth);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [employers, setEmployers] = useState<SelectOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(
    () => localStorage.getItem(selectedUserIdKey) ?? '',
  );
  const [selectedEmployerId, setSelectedEmployerId] = useState(
    () => localStorage.getItem(selectedEmployerIdKey) ?? '',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CurrentStatus | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<ClockAction | null>(null);
  const [isResolvingStale, setIsResolvingStale] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyValidationError, setHistoryValidationError] = useState<
    string | null
  >(null);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [historyFilterMode, setHistoryFilterMode] =
    useState<HistoryFilterMode>('current_month');
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [rangeFrom, setRangeFrom] = useState(defaultMonthRange?.from ?? '');
  const [rangeTo, setRangeTo] = useState(defaultMonthRange?.to ?? '');

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [loadedUsers, loadedEmployers] = await Promise.all([
          fetchUsers(),
          fetchEmployers(),
        ]);

        setUsers(loadedUsers);
        setEmployers(loadedEmployers);
        setSelectedUserId((currentUserId) =>
          currentUserId &&
          !loadedUsers.some((user) => user.id === currentUserId)
            ? ''
            : currentUserId,
        );
        setSelectedEmployerId((currentEmployerId) =>
          currentEmployerId &&
          !loadedEmployers.some((employer) => employer.id === currentEmployerId)
            ? ''
            : currentEmployerId,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown API error');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOptions();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      localStorage.setItem(selectedUserIdKey, selectedUserId);
      return;
    }

    localStorage.removeItem(selectedUserIdKey);
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedEmployerId) {
      localStorage.setItem(selectedEmployerIdKey, selectedEmployerId);
      return;
    }

    localStorage.removeItem(selectedEmployerIdKey);
  }, [selectedEmployerId]);

  useEffect(() => {
    if (!selectedUserId || !selectedEmployerId) {
      return;
    }

    let isCurrentRequest = true;

    const loadStatus = async () => {
      setIsStatusLoading(true);
      setStatusError(null);

      try {
        const currentStatus = await fetchStatus({
          userId: selectedUserId,
          employerId: selectedEmployerId,
        });

        if (isCurrentRequest) {
          setStatus(currentStatus);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setStatus(null);
          setStatusError(
            err instanceof Error ? err.message : 'Unknown API error',
          );
        }
      } finally {
        if (isCurrentRequest) {
          setIsStatusLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedEmployerId, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId || !selectedEmployerId) {
      return;
    }

    let isCurrentRequest = true;

    const loadHistory = async () => {
      const historyFilter = getActiveHistoryFilter({
        filterMode: historyFilterMode,
        selectedMonth,
        rangeFrom,
        rangeTo,
      });

      if (!historyFilter.filter) {
        if (isCurrentRequest) {
          setHistoryItems([]);
          setIsHistoryLoading(false);
          setHistoryError(null);
          setHistoryValidationError(historyFilter.validationError);
        }
        return;
      }

      setIsHistoryLoading(true);
      setHistoryError(null);
      setHistoryValidationError(null);

      try {
        const history = await fetchHistory({
          userId: selectedUserId,
          employerId: selectedEmployerId,
          filter: historyFilter.filter,
        });

        if (isCurrentRequest) {
          setHistoryItems(history.items);
        }
      } catch (err) {
        if (isCurrentRequest) {
          setHistoryItems([]);
          setHistoryError(
            err instanceof Error ? err.message : 'Unknown API error',
          );
        }
      } finally {
        if (isCurrentRequest) {
          setIsHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    historyFilterMode,
    rangeFrom,
    rangeTo,
    selectedEmployerId,
    selectedMonth,
    selectedUserId,
  ]);

  const loadStatusText = isLoading
    ? 'Loading users and employers...'
    : 'Choose who is working today.';
  const hasSelections = Boolean(selectedUserId && selectedEmployerId);
  const isActionLoading = loadingAction !== null;
  const isSelectionStatusPending = hasSelections && isStatusLoading;
  const hasStartedWorkDay =
    hasSelections &&
    status !== null &&
    status.state !== 'not_started' &&
    status.state !== 'needs_review';
  const areSelectionsDisabled =
    isLoading ||
    isActionLoading ||
    isResolvingStale ||
    isSelectionStatusPending ||
    hasStartedWorkDay;
  const visibleStatus = hasSelections ? status : null;
  const visibleStatusError = hasSelections ? statusError : null;
  const visibleHistoryItems = hasSelections ? historyItems : [];
  const visibleHistoryError = hasSelections ? historyError : null;

  const handleUserChange = (userId: string) => {
    setActionError(null);
    setSelectedUserId(userId);
  };

  const handleEmployerChange = (employerId: string) => {
    setActionError(null);
    setSelectedEmployerId(employerId);
  };

  const handleDownload = async () => {
    if (!selectedUserId || !selectedEmployerId || isDownloadLoading) {
      return;
    }

    const historyFilter = getActiveHistoryFilter({
      filterMode: historyFilterMode,
      selectedMonth,
      rangeFrom,
      rangeTo,
    });

    if (!historyFilter.filter) {
      setDownloadError(historyFilter.validationError);
      return;
    }

    setIsDownloadLoading(true);
    setDownloadError(null);

    try {
      await downloadHistoryCsv({
        userId: selectedUserId,
        employerId: selectedEmployerId,
        filter: historyFilter.filter,
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Unknown API error');
    } finally {
      setIsDownloadLoading(false);
    }
  };

  const handleAction = async (action: ClockAction) => {
    if (
      !selectedUserId ||
      !selectedEmployerId ||
      loadingAction ||
      isResolvingStale ||
      status?.state === 'needs_review'
    ) {
      return;
    }

    const actionInput = {
      userId: selectedUserId,
      employerId: selectedEmployerId,
    };
    const actionRequest = {
      clockIn,
      clockOut,
      endDay,
    }[action];
    const historyFilter = getActiveHistoryFilter({
      filterMode: historyFilterMode,
      selectedMonth,
      rangeFrom,
      rangeTo,
    });

    setLoadingAction(action);
    setActionError(null);

    try {
      await actionRequest(actionInput);
      const [currentStatus, history] = await Promise.all([
        fetchStatus(actionInput),
        historyFilter.filter
          ? fetchHistory({ ...actionInput, filter: historyFilter.filter })
          : Promise.resolve(null),
      ]);

      setStatus(currentStatus);
      if (history) {
        setHistoryError(null);
        setHistoryValidationError(null);
        setHistoryItems(history.items);
      } else {
        setHistoryItems([]);
        setHistoryError(null);
        setHistoryValidationError(historyFilter.validationError);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown API error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResolveStale = async (occurredAt?: string) => {
    if (
      !selectedUserId ||
      !selectedEmployerId ||
      loadingAction ||
      isResolvingStale ||
      status?.state !== 'needs_review'
    ) {
      return;
    }

    const actionInput = {
      userId: selectedUserId,
      employerId: selectedEmployerId,
    };
    const historyFilter = getActiveHistoryFilter({
      filterMode: historyFilterMode,
      selectedMonth,
      rangeFrom,
      rangeTo,
    });

    setIsResolvingStale(true);
    setActionError(null);

    try {
      await resolveStaleDay({
        ...actionInput,
        ...(occurredAt ? { occurredAt } : {}),
      });
      const [currentStatus, history] = await Promise.all([
        fetchStatus(actionInput),
        historyFilter.filter
          ? fetchHistory({ ...actionInput, filter: historyFilter.filter })
          : Promise.resolve(null),
      ]);

      setStatus(currentStatus);
      if (history) {
        setHistoryError(null);
        setHistoryValidationError(null);
        setHistoryItems(history.items);
      } else {
        setHistoryItems([]);
        setHistoryError(null);
        setHistoryValidationError(historyFilter.validationError);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown API error');
    } finally {
      setIsResolvingStale(false);
    }
  };

  return (
    <div className='rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl'>
      <p className='text-sm font-medium text-slate-400'>TimeTracker</p>
      <h1 className='mt-3 text-2xl font-bold'>Set up today&apos;s shift.</h1>
      <p className='mt-2 text-sm text-slate-400'>{loadStatusText}</p>

      {error && (
        <div className='mt-5 rounded-lg border border-red-900 bg-red-950/60 p-3 text-sm text-red-200'>
          Could not load options: {error}
        </div>
      )}

      <div className='mt-6 space-y-4'>
        <SelectField
          label='User'
          placeholder='Select user'
          options={users}
          value={selectedUserId}
          disabled={areSelectionsDisabled || users.length === 0}
          onChange={handleUserChange}
        />

        <SelectField
          label='Employer'
          placeholder='Select employer'
          options={employers}
          value={selectedEmployerId}
          disabled={areSelectionsDisabled || employers.length === 0}
          onChange={handleEmployerChange}
        />
      </div>

      {!isLoading && !error && (
        <p className='mt-5 text-sm text-slate-400'>
          {hasStartedWorkDay
            ? 'End the current day before changing user or employer.'
            : status?.state === 'needs_review'
              ? 'Clock actions are blocked for this selection until review is resolved.'
            : 'Your selections are saved on this device.'}
        </p>
      )}

      <CurrentStatusCard
        status={visibleStatus}
        isLoading={hasSelections && isStatusLoading}
        error={visibleStatusError}
        hasSelections={hasSelections}
        actionError={actionError}
        loadingAction={loadingAction}
        onAction={handleAction}
        isResolvingStale={isResolvingStale}
        onResolveStale={handleResolveStale}
      />

      <HistorySection
        items={visibleHistoryItems}
        isLoading={hasSelections && isHistoryLoading}
        error={visibleHistoryError}
        validationError={hasSelections ? historyValidationError : null}
        hasSelections={hasSelections}
        filterMode={historyFilterMode}
        selectedMonth={selectedMonth}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onFilterModeChange={setHistoryFilterMode}
        onSelectedMonthChange={setSelectedMonth}
        onRangeFromChange={setRangeFrom}
        onRangeToChange={setRangeTo}
        isDownloadLoading={isDownloadLoading}
        downloadError={hasSelections ? downloadError : null}
        onDownload={handleDownload}
      />
    </div>
  );
};
