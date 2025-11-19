import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

// Make Redis optional for local development
let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Don't retry, fail fast
  });
  redis.on('error', (err) => {
    logger.warn('Redis unavailable, caching disabled:', err.message);
    redis = null;
  });
  // Attempt connection but don't block startup
  redis.connect().catch(() => {
    logger.warn('Redis connection failed, running without cache');
    redis = null;
  });
} catch (err) {
  logger.warn('Redis initialization failed, running without cache');
}

export const redisCacheMiddleware = (prefix: string, ttlSeconds: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || !redis) {
      return next();
    }

    const key = `${prefix}:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Store original res.json to intercept the response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (redis) {
          redis.setex(key, ttlSeconds, JSON.stringify(body))
            .catch(err => logger.error('Redis cache error:', err));
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Redis cache error:', error);
      next();
    }
  };
};

// Clear cache by prefix
export const clearCache = async (prefix: string) => {
  if (!redis) return;
  const keys = await redis.keys(`${prefix}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};