import express from 'express';
import { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Mock ML model responses
const mockResponses = {
  price: {
    price: 199.99,
    confidence: 0.85,
    factors: ['high demand', 'limited supply', 'seasonal trend'],
    range: { min: 179.99, max: 219.99 },
    seasonality_impact: 0.2
  },

  demand: {
    score: 8.5,
    trend: 'increasing',
    factors: ['brand popularity', 'limited edition', 'social media buzz'],
    confidence: 0.9,
    segmentAnalysis: [
      {
        region: 'US',
        score: 9.0,
        factors: ['high disposable income', 'strong brand presence']
      }
    ]
  },

  seasonality: {
    pattern: 'high',
    peak_months: ['November', 'December'],
    demand_shift: 0.3,
    confidence: 0.85
  }
};

// Simulate ML processing delay
const simulateProcessing = () => new Promise(resolve => setTimeout(resolve, 500));

// Price prediction endpoint
app.post('/predict/price/enhanced', async (req: Request, res: Response) => {
  await simulateProcessing();
  res.json(mockResponses.price);
});

// Regional market analysis endpoint
app.post('/analyze/regional', async (req: Request, res: Response) => {
  await simulateProcessing();
  const { region } = req.body;
  res.json({
    trend: 'growing',
    confidence: 0.8,
    impactFactors: ['economic growth', 'sneaker culture'],
    competitorAnalysis: [
      {
        competitor: 'Store A',
        marketShare: 0.25,
        trend: 'stable'
      }
    ],
    marketSegmentation: [
      {
        segment: 'Youth',
        size: 0.4,
        growth: 0.15
      }
    ]
  });
});

// Seasonality analysis endpoint
app.post('/analyze/seasonality', async (req: Request, res: Response) => {
  await simulateProcessing();
  res.json(mockResponses.seasonality);
});

// Competitor analysis endpoint
app.post('/analyze/competitors', async (req: Request, res: Response) => {
  await simulateProcessing();
  res.json({
    mainCompetitors: [
      {
        name: 'Competitor A',
        strength: 0.8,
        overlap: 0.6
      }
    ],
    marketDynamics: {
      competitionLevel: 'high',
      barriers: ['brand loyalty', 'distribution network']
    }
  });
});

// Error simulation endpoint
app.post('/simulate/error', (_req: Request, res: Response) => {
  res.status(500).json({
    error: 'Simulated ML processing error'
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Mock ML API running on port ${port}`);
});

export default app;