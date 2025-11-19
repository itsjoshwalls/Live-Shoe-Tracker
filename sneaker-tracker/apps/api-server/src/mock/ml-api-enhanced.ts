import express from 'express';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Simulate different market conditions
const marketConditions = {
  NORMAL: 'normal',
  HYPE: 'hype',
  RECESSION: 'recession',
  SEASONAL_PEAK: 'seasonal_peak'
};

let currentMarketCondition = marketConditions.NORMAL;

// Mock data store
const mockData = {
  releases: new Map(),
  competitors: new Map(),
  marketTrends: new Map()
};

// Initialize some mock data
mockData.releases.set('test-release-1', {
  id: 'test-release-1',
  name: 'Test Sneaker 1',
  basePrice: 199.99,
  demand: 0.8
});

// Market condition modifier functions
const getPriceModifier = (condition: string): number => {
  switch (condition) {
    case marketConditions.HYPE: return 1.5;
    case marketConditions.RECESSION: return 0.7;
    case marketConditions.SEASONAL_PEAK: return 1.3;
    default: return 1.0;
  }
};

// Enhanced price prediction endpoint
app.post('/predict/price/enhanced', async (req: Request, res: Response) => {
  const { releaseId, features } = req.body;
  
  // Simulate ML processing
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const release = mockData.releases.get(releaseId) || {
    basePrice: 150,
    demand: 0.5
  };
  
  const marketModifier = getPriceModifier(currentMarketCondition);
  const seasonalityFactor = features?.seasonality?.impact || 1.0;
  
  const predictedPrice = release.basePrice * marketModifier * seasonalityFactor;
  
  res.json({
    price: predictedPrice,
    confidence: 0.85,
    factors: [
      'market condition',
      'seasonality',
      'demand level'
    ],
    range: {
      min: predictedPrice * 0.9,
      max: predictedPrice * 1.1
    },
    seasonality_impact: seasonalityFactor,
    market_condition: currentMarketCondition
  });
});

// Enhanced regional market analysis
app.post('/analyze/regional', async (req: Request, res: Response) => {
  const { region, timeframe } = req.body;
  
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const regionalData = {
    US: {
      marketSize: 5000000000,
      growthRate: 0.12,
      topBrands: ['Nike', 'Adidas', 'Jordan'],
      demographics: {
        youth: 0.4,
        adult: 0.5,
        senior: 0.1
      }
    },
    EU: {
      marketSize: 4000000000,
      growthRate: 0.08,
      topBrands: ['Adidas', 'Nike', 'Puma'],
      demographics: {
        youth: 0.35,
        adult: 0.55,
        senior: 0.1
      }
    }
  };
  
  const data = regionalData[region] || {
    marketSize: 1000000000,
    growthRate: 0.05,
    topBrands: ['Local Brand'],
    demographics: {
      youth: 0.3,
      adult: 0.6,
      senior: 0.1
    }
  };
  
  res.json({
    market_size: data.marketSize,
    growth_rate: data.growthRate,
    top_brands: data.topBrands,
    demographics: data.demographics,
    trend: currentMarketCondition === marketConditions.RECESSION ? 'declining' : 'growing',
    confidence: 0.9,
    forecast: {
      short_term: 'stable',
      long_term: 'positive',
      factors: ['economic growth', 'fashion trends', 'sports events']
    }
  });
});

// Advanced seasonality analysis
app.post('/analyze/seasonality', async (req: Request, res: Response) => {
  const { category, historical_data } = req.body;
  
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const seasonalPatterns = {
    running: {
      peak_months: ['March', 'April', 'September'],
      low_months: ['December', 'January'],
      yearly_pattern: 'bimodal'
    },
    basketball: {
      peak_months: ['October', 'November'],
      low_months: ['July', 'August'],
      yearly_pattern: 'unimodal'
    },
    lifestyle: {
      peak_months: ['December'],
      low_months: ['February'],
      yearly_pattern: 'holiday-driven'
    }
  };
  
  const pattern = seasonalPatterns[category] || seasonalPatterns.lifestyle;
  
  res.json({
    pattern: pattern.yearly_pattern,
    peak_months: pattern.peak_months,
    low_months: pattern.low_months,
    demand_shift: 0.3,
    confidence: 0.85,
    recommendations: {
      launch_timing: pattern.peak_months[0],
      inventory_planning: 'increase_before_peak',
      pricing_strategy: 'dynamic'
    }
  });
});

// Market simulation endpoints
app.post('/simulate/market-condition', (req: Request, res: Response) => {
  const { condition } = req.body;
  if (Object.values(marketConditions).includes(condition)) {
    currentMarketCondition = condition;
    res.json({ status: 'success', current_condition: condition });
  } else {
    res.status(400).json({ error: 'Invalid market condition' });
  }
});

// Error simulation endpoints
app.post('/simulate/error/timeout', (_req: Request, res: Response) => {
  setTimeout(() => {
    res.status(504).json({ error: 'Request timeout' });
  }, 5000);
});

app.post('/simulate/error/rate-limit', (_req: Request, res: Response) => {
  res.status(429).json({ error: 'Rate limit exceeded' });
});

app.post('/simulate/error/validation', (_req: Request, res: Response) => {
  res.status(400).json({
    error: 'Validation error',
    details: ['Invalid input format', 'Missing required fields']
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    market_condition: currentMarketCondition,
    uptime: process.uptime()
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Enhanced Mock ML API running on port ${port}`);
});

export default app;