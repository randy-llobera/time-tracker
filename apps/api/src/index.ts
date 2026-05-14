import express from 'express';
import cors from 'cors';
import { eventsRouter } from './routes/events.js';
import { downloadRouter } from './routes/download.js';
import { employersRouter } from './routes/employers.js';
import { historyRouter } from './routes/history.js';
import { statusRouter } from './routes/status.js';
import { usersRouter } from './routes/users.js';

const app = express();

const allowedOrigins = new Set(
  [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.WEB_ORIGIN,
  ]
    .filter(Boolean)
    .map((origin) => origin!.replace(/\/$/, '')),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  }),
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/employers', employersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/download', downloadRouter);
app.use('/api/history', historyRouter);
app.use('/api/status', statusRouter);
app.use('/api/users', usersRouter);

export default app;
