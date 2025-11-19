import { Router } from 'express';
import { metricsMiddleware } from '../lib/metrics';

const router = Router();

// Expose Prometheus metrics endpoint
router.get('/', metricsMiddleware);

export default router;
