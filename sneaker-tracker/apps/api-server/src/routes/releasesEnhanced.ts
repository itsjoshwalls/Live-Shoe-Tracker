import { Router } from 'express';
import {
  getReleasesByQuery,
  searchReleases,
  getReleaseAnalytics,
  getCachedReleases,
  batchCreateReleases,
  QueryOptions,
  ValidationError
} from '../lib/dbEnhanced';

const router = Router();

// Get releases with query options
router.get('/query', async (req, res) => {
  try {
    const options: QueryOptions = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sorts: req.query.sortBy ? [{ field: req.query.sortBy as string, order: (req.query.sortOrder as 'asc' | 'desc') || 'asc' }] : undefined,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined
    };
    
    const releases = await getReleasesByQuery(options);
    res.json(releases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// Search releases
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const releases = await searchReleases(query);
    res.json(releases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search releases' });
  }
});

// Get release analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const analytics = await getReleaseAnalytics(req.params.id);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch release analytics' });
  }
});

// Get cached releases
router.get('/cached', async (req, res) => {
  try {
    const releases = await getCachedReleases();
    res.json(releases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cached releases' });
  }
});

// Batch create releases
router.post('/batch', async (req, res) => {
  try {
    const releases = await batchCreateReleases(req.body);
    res.status(201).json(releases);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create releases' });
    }
  }
});

export default router;