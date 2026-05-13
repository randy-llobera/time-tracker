import { Router } from 'express';
import { z } from 'zod';
import { listHistory } from '../db/history.js';

const historyQuerySchema = z.object({
  userId: z.uuid(),
  employerId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const historyRouter = Router();

historyRouter.get('/', async (req, res, next) => {
  try {
    const query = historyQuerySchema.parse(req.query);

    res.json({ items: await listHistory(query) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid history request.' });
      return;
    }

    next(error);
  }
});
