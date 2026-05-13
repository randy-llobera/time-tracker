import { Router } from 'express';
import { z } from 'zod';
import { getCurrentStatus } from '../db/status.js';

const statusQuerySchema = z.object({
  userId: z.uuid(),
  employerId: z.uuid(),
});

export const statusRouter = Router();

statusRouter.get('/', async (req, res, next) => {
  try {
    const query = statusQuerySchema.parse(req.query);

    res.json(await getCurrentStatus(query));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid status request.' });
      return;
    }

    next(error);
  }
});
