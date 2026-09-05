import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

class InMemoryCache {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && durationSeconds) {
      expiresAt = Date.now() + durationSeconds * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const currentStr = await this.get(key);
    const val = (currentStr ? parseInt(currentStr, 10) : 0) + 1;
    this.store.set(key, { value: val.toString() });
    return val;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, item);
    return 1;
  }
}

let redisClient: any;

try {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy() {
      return null; // Stop retrying if connection fails and fallback to InMemoryCache
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    logger.warn('Redis unavailable, switching to in-memory fallback cache', { error: err.message });
  });

  redisClient = redis;
} catch (e) {
  logger.warn('Failed to initialize Redis client, using in-memory cache');
  redisClient = new InMemoryCache();
}

export const cache = redisClient instanceof Redis ? redisClient : new InMemoryCache();
