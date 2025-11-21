import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
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
// Early diagnostics: summarize presence (not values) of critical env vars
const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];
try {
  const summary = requiredEnv.map(k => ({ key: k, present: !!process.env[k] })).reduce((acc, cur) => {
    acc[cur.key] = cur.present;
    return acc;
  }, {} as Record<string, boolean>);
  logger.info({ msg: 'Env presence summary', env: summary });
} catch (e) {
  // Fail silently if logging fails to avoid blocking startup
}

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
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  }
});
const PORT = process.env.PORT || 3000;

// Socket.IO real-time connection handling
io.on('connection', (socket) => {
  logger.info(`Socket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Socket client disconnected: ${socket.id}`);
  });
});

// Export io for use in other modules
export { io };

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

// Fallback health route if upstream router fails (e.g. init error)
app.get('/api/health/fallback', (req: Request, res: Response) => {
  res.json({ status: 'ok', fallback: true, timestamp: new Date().toISOString() });
});

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
  try {
    httpServer.listen(PORT, () => {
      logger.info(`API server is running on http://localhost:${PORT}`);
      logger.info(`Socket.IO enabled for real-time updates`);
    });
  } catch (err) {
    logger.error({ msg: 'Server startup failed', error: (err as Error).message });
  }
}

export default app;