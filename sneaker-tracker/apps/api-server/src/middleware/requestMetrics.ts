import { Request, Response, NextFunction } from 'express';

type RouteCounters = Record<string, number>;

const startTime = Date.now();
let totalRequests = 0;
const requestsPerRoute: RouteCounters = {};
const totalResponseTimePerRoute: Record<string, number> = {};

export const requestMetricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  totalRequests += 1;
  const key = `${req.method} ${req.path}`;
  requestsPerRoute[key] = (requestsPerRoute[key] || 0) + 1;

  res.on('finish', () => {
    const took = Date.now() - start;
    totalResponseTimePerRoute[key] = (totalResponseTimePerRoute[key] || 0) + took;
  });

  next();
};

export const getMetrics = () => ({
  uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  totalRequests,
  requestsPerRoute,
  averageResponseTimeMsPerRoute: Object.fromEntries(
    Object.entries(totalResponseTimePerRoute).map(([k, total]) => [k, Math.round(total / (requestsPerRoute[k] || 1))])
  ),
});

export default requestMetricsMiddleware;
