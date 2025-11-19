import { Router } from 'express';
import { EnhancedMLService } from '../lib/ml-enhanced';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/error';

const router = Router();
const mlService = EnhancedMLService.getInstance();

// Get price prediction for a release
router.get('/predictions/price/:releaseId', asyncHandler(async (req, res) => {
  const prediction = await mlService.predictPrice(req.params.releaseId);
  res.json(prediction);
}));

// Get regional market analysis
router.get('/analysis/regional/:region', asyncHandler(async (req, res) => {
  const analysis = await mlService.analyzeRegionalMarket(req.params.region);
  res.json(analysis);
}));

// Get seasonality analysis for a release
router.get('/analysis/seasonality/:releaseId', asyncHandler(async (req, res) => {
  const analysis = await mlService.analyzeSeasonality(req.params.releaseId);
  res.json(analysis);
}));

// Get competitor analysis for a release
router.get('/analysis/competitors/:releaseId', asyncHandler(async (req, res) => {
  const analysis = await mlService.analyzeCompetitors(req.params.releaseId);
  res.json(analysis);
}));

// Batch predictions endpoint
router.post('/predictions/batch', validateRequest, asyncHandler(async (req, res) => {
  const { releaseIds } = req.body;
  
  const predictions = await Promise.all(
    releaseIds.map(async (id: string) => ({
      releaseId: id,
      price: await mlService.predictPrice(id),
      seasonality: await mlService.analyzeSeasonality(id)
    }))
  );
  
  res.json(predictions);
}));

export default router;