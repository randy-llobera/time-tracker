import { useEffect, useState } from 'react';
import {
  clockIn,
  clockOut,
  endDay,
  fetchEmployers,
  fetchStatus,
  fetchUsers,
  type CurrentStatus,
  type SelectOption,
} from '../api/client';
import {
  CurrentStatusCard,
  type ClockAction,
} from './CurrentStatusCard';
import { SelectField } from './SelectField';

const selectedUserIdKey = 'selectedUserId';
const selectedEmployerIdKey = 'selectedEmployerId';

export const SelectionCard = () => {
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
  const [actionError, setActionError] = useState<string | null>(null);

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

  const loadStatusText = isLoading
    ? 'Loading users and employers...'
    : 'Choose who is working today.';
  const hasSelections = Boolean(selectedUserId && selectedEmployerId);

  const handleAction = async (action: ClockAction) => {
    if (!selectedUserId || !selectedEmployerId) {
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

    setLoadingAction(action);
    setActionError(null);

    try {
      await actionRequest(actionInput);
      setStatus(await fetchStatus(actionInput));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unknown API error');
    } finally {
      setLoadingAction(null);
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
          disabled={isLoading || users.length === 0}
          onChange={setSelectedUserId}
        />

        <SelectField
          label='Employer'
          placeholder='Select employer'
          options={employers}
          value={selectedEmployerId}
          disabled={isLoading || employers.length === 0}
          onChange={setSelectedEmployerId}
        />
      </div>

      {!isLoading && !error && (
        <p className='mt-5 text-sm text-slate-400'>
          Your selections are saved on this device.
        </p>
      )}

      <CurrentStatusCard
        status={status}
        isLoading={isStatusLoading}
        error={statusError}
        hasSelections={hasSelections}
        actionError={actionError}
        loadingAction={loadingAction}
        onAction={handleAction}
      />
    </div>
  );
};
