import { Router } from 'express';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { listHistoryForExport } from '../db/history.js';
import {
  getHistoryDateBounds,
  type HistoryDateBounds,
  historyQuerySchema,
} from '../utils/historyFilters.js';

const DISPLAY_TIME_ZONE = 'Europe/Madrid';

const formatDatePart = (value: number) => value.toString().padStart(2, '0');

const localDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const formatDisplayDate = (value: Date | string) => {
  if (value instanceof Date) {
    return localDateFormatter.format(value);
  }

  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

const localDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatDisplayDateTime = (value: Date | null) => {
  if (!value) {
    return '';
  }

  const parts = Object.fromEntries(
    localDateTimeFormatter
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
};

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};

const getPeriodLabel = ({ fromDate, toDate }: HistoryDateBounds) => {
  if (!fromDate || !toDate) {
    return 'All matching records';
  }

  return `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;
};

const getDownloadFilename = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();

  return `work-time-export-${day}${month}${year}.csv`;
};

export const downloadRouter = Router();

downloadRouter.get('/', async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    const dateBounds = getHistoryDateBounds(query);
    const items = await listHistoryForExport({ ...query, ...dateBounds });
    const totalWorkedSeconds = items.reduce(
      (total, item) => total + item.totalWorkedSeconds,
      0,
    );
    const csv = stringify(
      [
        ['Period', getPeriodLabel(dateBounds)],
        ['Total Worked Hours', formatDuration(totalWorkedSeconds)],
        ['Total Days Worked', items.length.toString()],
        [],
        [
          'User',
          'Employer',
          'Work Date',
          'Started At',
          'Ended At',
          'Total Worked Hours',
          'Total Break Hours',
        ],
        ...items.map((item) => [
          item.userName,
          item.employerName,
          formatDisplayDate(item.workDate),
          formatDisplayDateTime(item.startedAt),
          formatDisplayDateTime(item.endedAt),
          formatDuration(item.totalWorkedSeconds),
          formatDuration(item.totalBreakSeconds),
        ]),
      ],
      {
        quoted_string: true,
      },
    );

    res
      .type('text/csv')
      .set(
        'Content-Disposition',
        `attachment; filename="${getDownloadFilename()}"`,
      )
      .send(csv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid download request.' });
      return;
    }

    next(error);
  }
});
