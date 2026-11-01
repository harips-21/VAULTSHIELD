import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
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
  MAX_FILE_SIZE_MB: z.string().default('50').transform(Number),
}).superRefine((values, context) => {
  if (values.NODE_ENV !== 'production') {
    return;
  }

  if (values.JWT_SECRET.length < 32 || values.JWT_SECRET === 'super-secret-jwt-access-key-2026') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET must be a unique secret of at least 32 characters in production',
    });
  }

  if (
    values.JWT_REFRESH_SECRET.length < 32 ||
    values.JWT_REFRESH_SECRET === 'super-secret-jwt-refresh-key-2026' ||
    values.JWT_REFRESH_SECRET === values.JWT_SECRET
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must be a unique secret of at least 32 characters in production',
    });
  }

  if (
    !/^[a-fA-F0-9]{64}$/.test(values.MASTER_ENCRYPTION_KEY) ||
    values.MASTER_ENCRYPTION_KEY === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MASTER_ENCRYPTION_KEY'],
      message: 'MASTER_ENCRYPTION_KEY must be a unique 64-character hexadecimal key in production',
    });
  }
});

export const env = envSchema.parse(process.env);
