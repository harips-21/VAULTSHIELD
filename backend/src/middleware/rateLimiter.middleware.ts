import { NextFunction, Request, Response } from 'express';
import { cache } from '../utils/redis';

export function createRateLimiter(limit: number = 20, windowSeconds: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${req.path}:${ip}`;

    try {
      const current = await cache.incr(key);
      if (current === 1) {
        await cache.expire(key, windowSeconds);
      }

      if (current > limit) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${windowSeconds} seconds.`,
        });
      }

      next();
    } catch (err) {
      // In case of rate limiter error, allow request to proceed
      next();
    }
  };
}
