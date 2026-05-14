import { Router } from 'express';
import { stringify } from 'csv-stringify/sync';
import { z } from 'zod';
import { listHistoryForExport } from '../db/history.js';
import {
  getHistoryDateBounds,
  type HistoryDateBounds,
  historyQuerySchema,
} from '../utils/historyFilters.js';

const formatDatePart = (value: number) => value.toString().padStart(2, '0');

const formatDisplayDate = (value: Date | string) => {
  if (value instanceof Date) {
    return [
      formatDatePart(value.getUTCDate()),
      formatDatePart(value.getUTCMonth() + 1),
      value.getUTCFullYear().toString(),
    ].join('/');
  }

  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
};

const formatDisplayDateTime = (value: Date | null) => {
  if (!value) {
    return '';
  }

  const date = [
    formatDatePart(value.getDate()),
    formatDatePart(value.getMonth() + 1),
    value.getFullYear().toString(),
  ].join('/');
  const hours = value.getHours();
  const minutes = value.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${date} ${formatDatePart(displayHours)}:${formatDatePart(minutes)} ${period}`;
};

const formatHours = (seconds: number) => (seconds / 3600).toFixed(2);

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
        ['Total Worked Hours', formatHours(totalWorkedSeconds)],
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
          formatDisplayDate(item.startedAt),
          formatDisplayDateTime(item.startedAt),
          formatDisplayDateTime(item.endedAt),
          formatHours(item.totalWorkedSeconds),
          formatHours(item.totalBreakSeconds),
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
