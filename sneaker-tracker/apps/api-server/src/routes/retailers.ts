import { Router } from 'express';
import { getRetailers, createRetailer, updateRetailer, deleteRetailer } from '../lib/db';

const router = Router();

// Get all retailers
router.get('/', async (req, res) => {
    try {
        const retailers = await getRetailers();
        res.json(retailers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch retailers' });
    }
});

// Create a new retailer
router.post('/', async (req, res) => {
    try {
        const retailer = await createRetailer(req.body);
        res.status(201).json(retailer);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create retailer' });
    }
});

// Update an existing retailer
router.put('/:id', async (req, res) => {
    try {
        const retailer = await updateRetailer(req.params.id, req.body);
        res.json(retailer);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update retailer' });
    }
});

// Delete a retailer
router.delete('/:id', async (req, res) => {
    try {
        await deleteRetailer(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete retailer' });
    }
});

export default router;