import { z } from 'zod';

export const historyPeriodSchema = z.enum([
  'current_week',
  'current_month',
  'range',
]);

export const historyDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => formatDate(parseDate(value)) === value);

type HistoryPeriod = z.infer<typeof historyPeriodSchema>;

type HistoryFilterInput = {
  period?: HistoryPeriod;
  today?: string;
  from?: string;
  to?: string;
};

export type HistoryDateBounds = {
  fromDate?: string;
  toDate?: string;
};

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day));
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
};

export const getHistoryDateBounds = (
  input: HistoryFilterInput,
): HistoryDateBounds => {
  if (!input.period) {
    if (input.today || input.from || input.to) {
      throw new z.ZodError([]);
    }

    return {};
  }

  if (input.period === 'range') {
    if (!input.from || !input.to || input.today || input.from > input.to) {
      throw new z.ZodError([]);
    }

    return {
      fromDate: input.from,
      toDate: input.to,
    };
  }

  if (!input.today || input.from || input.to) {
    throw new z.ZodError([]);
  }

  const today = parseDate(input.today);

  if (input.period === 'current_week') {
    const daysSinceMonday = (today.getUTCDay() + 6) % 7;
    const fromDate = addDays(today, -daysSinceMonday);

    return {
      fromDate: formatDate(fromDate),
      toDate: formatDate(addDays(fromDate, 6)),
    };
  }

  return {
    fromDate: formatDate(
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    ),
    toDate: formatDate(
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)),
    ),
  };
};
