import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/securedocdb?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().default('super-secret-jwt-access-key-2026'),
  JWT_REFRESH_SECRET: z.string().default('super-secret-jwt-refresh-key-2026'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MASTER_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'), // 64 hex chars = 32 bytes
  STORAGE_DIR: z.string().default('./storage/encrypted'),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('50'),
});

export const env = envSchema.parse(process.env);
