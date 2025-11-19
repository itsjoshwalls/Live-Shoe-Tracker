import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import timeout from 'express-timeout-handler';
import { Request, Response } from 'express';
import releasesRouter from './routes/releases';
import releasesEnhancedRouter from './routes/releasesEnhanced';
import retailersRouter from './routes/retailers';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';
import subscriptionsRouter from './routes/subscriptions';
import { requestMetricsMiddleware } from './lib/metrics';
import logger from './lib/logger';

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in prod
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Timeout options
const timeoutOptions = {
  timeout: 30000, // 30 seconds
  onTimeout: (req: Request, res: Response) => {
    res.status(503).send('Service unavailable. Please retry later.');
  },
  onDelayedResponse: (req: Request, method: string, args: unknown[], requestTime: number) => {
    logger.warn(`Delayed response: ${method} ${req.url} ${requestTime}ms`);
  }
};

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Request size limit
app.use(timeout.handler(timeoutOptions)); // Request timeouts
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) }})); // HTTP request logging
app.use(requestMetricsMiddleware); // basic in-memory metrics
app.use(limiter); // Rate limiting

// Routes
app.use('/api/releases', releasesRouter);
app.use('/api/releases/enhanced', releasesEnhancedRouter);
app.use('/api/retailers', retailersRouter);
app.use('/api/health', healthRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      code: 'RESOURCE_NOT_FOUND'
    }
  });
});

// Global error handler
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// Export app for tests. Only start server when invoked directly.
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`API server is running on http://localhost:${PORT}`);
    });
}

export default app;