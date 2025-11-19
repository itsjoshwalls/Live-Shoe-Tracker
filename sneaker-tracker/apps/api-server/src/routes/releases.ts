import { Router } from 'express';
import { getReleases, createRelease, updateRelease, deleteRelease } from '../lib/db';
import { ReleaseSchema, ReleaseUpdateSchema } from '../schemas/release.schema';
import { redisCacheMiddleware, clearCache } from '../middleware/redisCache';
import { ZodError } from 'zod';

const router = Router();
const CACHE_PREFIX = 'releases';

// Get all shoe releases (cached with Redis)
router.get('/', redisCacheMiddleware(CACHE_PREFIX, 300), async (req, res) => {
    try {
        const releases = await getReleases();
        res.json(releases);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch releases' });
    }
});

// Create a new shoe release
router.post('/', async (req, res) => {
    try {
        const validatedData = ReleaseSchema.parse(req.body);
        const newRelease = await createRelease(validatedData);
        await clearCache(CACHE_PREFIX);
        res.status(201).json(newRelease);
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ 
                error: 'Validation failed',
                details: error.format()
            });
        } else {
            res.status(400).json({ error: 'Failed to create release' });
        }
    }
});

// Update an existing shoe release
router.put('/:id', async (req, res) => {
    try {
        const validatedData = ReleaseUpdateSchema.parse(req.body);
        const updatedRelease = await updateRelease(req.params.id, validatedData);
        await clearCache(CACHE_PREFIX);
        res.json(updatedRelease);
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ 
                error: 'Validation failed',
                details: error.format()
            });
        } else {
            res.status(400).json({ error: 'Failed to update release' });
        }
    }
});

// Delete a shoe release
router.delete('/:id', async (req, res) => {
    try {
        await deleteRelease(req.params.id);
        await clearCache(CACHE_PREFIX);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete release' });
    }
});

export default router;