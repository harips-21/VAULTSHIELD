import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import activityRoutes from './routes/activity.routes';
import authRoutes from './routes/auth.routes';
import commentRoutes from './routes/comment.routes';
import documentRoutes from './routes/document.routes';
import folderRoutes from './routes/folder.routes';
import shareRoutes from './routes/share.routes';
import versionRoutes from './routes/version.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
