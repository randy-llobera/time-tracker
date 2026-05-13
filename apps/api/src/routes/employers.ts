import { Router } from 'express';
import { listActiveEmployers } from '../db/employers.js';

export const employersRouter = Router();

employersRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listActiveEmployers());
  } catch (error) {
    next(error);
  }
});
