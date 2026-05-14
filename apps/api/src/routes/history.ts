import { Router } from 'express';
import { z } from 'zod';
import { listHistory } from '../db/history.js';
import {
  getHistoryDateBounds,
  historyDateSchema,
  historyPeriodSchema,
} from '../utils/historyFilters.js';

const historyQuerySchema = z.object({
  userId: z.uuid(),
  employerId: z.uuid(),
  period: historyPeriodSchema.optional(),
  today: historyDateSchema.optional(),
  from: historyDateSchema.optional(),
  to: historyDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const historyRouter = Router();

historyRouter.get('/', async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);
    const dateBounds = getHistoryDateBounds(query);

    res.json({ items: await listHistory({ ...query, ...dateBounds }) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid history request.' });
      return;
    }

    next(error);
  }
});
