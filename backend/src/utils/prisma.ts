import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient();

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
