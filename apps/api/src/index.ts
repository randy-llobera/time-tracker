import express from 'express';
import cors from 'cors';

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

export default app;
