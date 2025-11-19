import { Request, Response, NextFunction } from 'express';

type CacheEntry = { value: any; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export const cacheMiddleware = (ttlSeconds = 30) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = `${req.originalUrl}`;
    const entry = cache.get(key);
    const now = Date.now();

    if (entry && entry.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(entry.value);
    }

    // hijack res.json to capture value
    const originalJson = res.json.bind(res);
    res.json = (body?: any) => {
      try {
        cache.set(key, { value: body, expiresAt: Date.now() + ttlSeconds * 1000 });
        res.setHeader('X-Cache', 'MISS');
      } catch (e) {
        // ignore cache failures
      }
      return originalJson(body);
    };

    next();
  };
};

export const clearCache = () => cache.clear();

export default cacheMiddleware;
