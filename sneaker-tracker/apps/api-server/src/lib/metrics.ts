import { Registry, Counter, Histogram } from 'prom-client';
import { Request, Response } from 'express';

// Create a new registry
export const register = new Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'sneaker-tracker-api'
});

// Create metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
});

// Create a metrics middleware
export const metricsMiddleware = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    res.status(500).send(err);
  }
};

// Create a request metrics middleware
export const requestMetricsMiddleware = (req: Request, res: Response, next: Function) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path || req.path,
      status: res.statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        path: req.route?.path || req.path,
        status: res.statusCode
      },
      duration / 1000
    );
  });

  next();
};