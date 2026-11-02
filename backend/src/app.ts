import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import './config/env';
import { errorHandler } from './middleware/error.middleware';

import activityRoutes from './routes/activity.routes';
import authRoutes from './routes/auth.routes';
import commentRoutes from './routes/comment.routes';
import documentRoutes from './routes/document.routes';
import folderRoutes from './routes/folder.routes';
import shareRoutes from './routes/share.routes';
import versionRoutes from './routes/version.routes';

const app = express();

const sanitizeForJson = (value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForJson);
  }

  if (value && typeof value === 'object') {
    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeForJson(item)])
    );
  }

  return value;
};

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => originalJson(sanitizeForJson(body))) as typeof res.json;
  next();
});

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/folders', folderRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/documents', versionRoutes); // mounts /:documentId/versions
app.use('/api/v1/shares', shareRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/comments', commentRoutes);

// Error Handling
app.use(errorHandler);

export default app;
