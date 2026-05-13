import { type NextFunction, type Response, Router } from 'express';
import { z } from 'zod';
import {
  clockIn,
  clockOut,
  endDay,
  EventActionError,
} from '../db/events.js';

const eventActionSchema = z.object({
  userId: z.uuid(),
  employerId: z.uuid(),
  occurredAt: z.iso.datetime().optional(),
});

export const eventsRouter = Router();

const parseEventAction = (body: unknown) => {
  const data = eventActionSchema.parse(body);

  return {
    userId: data.userId,
    employerId: data.employerId,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
  };
};

const handleEventError = (
  error: unknown,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid event request.' });
    return;
  }

  if (error instanceof EventActionError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
};

eventsRouter.post('/clock-in', async (req, res, next) => {
  try {
    res.status(201).json(await clockIn(parseEventAction(req.body)));
  } catch (error) {
    handleEventError(error, res, next);
  }
});

eventsRouter.post('/clock-out', async (req, res, next) => {
  try {
    res.status(201).json(await clockOut(parseEventAction(req.body)));
  } catch (error) {
    handleEventError(error, res, next);
  }
});

eventsRouter.post('/end-day', async (req, res, next) => {
  try {
    res.status(201).json(await endDay(parseEventAction(req.body)));
  } catch (error) {
    handleEventError(error, res, next);
  }
});
