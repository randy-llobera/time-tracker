import { type NextFunction, type Response, Router } from 'express';
import { z } from 'zod';
import {
  clockIn,
  clockOut,
  endDay,
  EventActionError,
  resolveStaleDay,
} from '../db/events.js';

const eventActionSchema = z.object({
  userId: z.uuid(),
  employerId: z.uuid(),
}).strict();

const resolveStaleDaySchema = eventActionSchema.extend({
  occurredAt: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || !Number.isNaN(new Date(value).getTime()),
    ),
}).strict();

export const eventsRouter = Router();

const parseEventAction = (body: unknown) => {
  const data = eventActionSchema.parse(body);

  return {
    userId: data.userId,
    employerId: data.employerId,
  };
};

const parseResolveStaleDay = (body: unknown) => {
  const data = resolveStaleDaySchema.parse(body);

  return {
    userId: data.userId,
    employerId: data.employerId,
    occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
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
    const result = await clockIn(parseEventAction(req.body));

    res.status(201).json(result);
  } catch (error) {
    handleEventError(error, res, next);
  }
});

eventsRouter.post('/clock-out', async (req, res, next) => {
  try {
    const result = await clockOut(parseEventAction(req.body));

    res.status(201).json(result);
  } catch (error) {
    handleEventError(error, res, next);
  }
});

eventsRouter.post('/end-day', async (req, res, next) => {
  try {
    const result = await endDay(parseEventAction(req.body));

    res.status(201).json(result);
  } catch (error) {
    handleEventError(error, res, next);
  }
});

eventsRouter.post('/resolve-stale-day', async (req, res, next) => {
  try {
    const result = await resolveStaleDay(parseResolveStaleDay(req.body));

    res.status(201).json(result);
  } catch (error) {
    handleEventError(error, res, next);
  }
});
