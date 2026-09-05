import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`🚀 Secure Document Management Platform Backend running on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});
