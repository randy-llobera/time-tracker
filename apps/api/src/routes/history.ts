import { Router } from 'express';
import { z } from 'zod';
import { listHistory } from '../db/history.js';
import {
  getHistoryDateBounds,
  historyQuerySchema,
} from '../utils/historyFilters.js';

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
