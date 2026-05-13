import { Router } from 'express';
import { listActiveUsers } from '../db/users.js';

export const usersRouter = Router();

usersRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listActiveUsers());
  } catch (error) {
    next(error);
  }
});
