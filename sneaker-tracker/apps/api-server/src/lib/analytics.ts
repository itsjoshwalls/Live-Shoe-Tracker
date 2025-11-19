import { supabase } from './db';
import { EnhancedRelease, ReleaseMethod } from './schemas';
import { DatabaseError } from './db';

// Market Analysis Types
interface MarketTrends {
  averagePrice: number;
  priceVolatility: number;
  demandScore: number;
  supplyLevel: string;
  priceDirection: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

interface CompetitorAnalysis {
  retailer: string;
  price: number;
  inStock: boolean;
  releaseMethod: ReleaseMethod;
  region: string;
  lastUpdated: Date;
}

interface StockPrediction {
  size: string;
  probability: number;
  estimatedQuantity: number;
  confidence: number;
}

// Advanced Analysis Functions
export async function analyzeMarketTrends(releaseId: string): Promise<MarketTrends> {
  try {
    // Get release and its price history
    const { data: release, error } = await supabase
      .from('releases')
      .select('*, priceHistory(*)')
      .eq('id', releaseId)
      .single();
    
    if (error) throw new DatabaseError('Failed to fetch release data', error);
    if (!release) throw new DatabaseError('Release not found');

    const priceHistory = release.priceHistory || [];
    
    // Calculate price trends
    const prices = priceHistory.map(h => h.price);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - averagePrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);
    
    // Calculate price direction
    const recentPrices = priceHistory
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(h => h.price);
    
    const priceDirection = calculatePriceDirection(recentPrices);
    
    // Calculate demand score
    const demandScore = calculateDemandScore(release);
    
    // Determine supply level
    const supplyLevel = determineSupplyLevel(release);
    
    return {
      averagePrice,
      priceVolatility: volatility,
      demandScore,
      supplyLevel,
      priceDirection,
      confidence: calculateConfidence(priceHistory.length)
    };
  } catch (error) {
    throw new DatabaseError('Error analyzing market trends', error);
  }
}

export async function analyzeCompetitors(releaseId: string): Promise<CompetitorAnalysis[]> {
  try {
    const { data: competitors, error } = await supabase
      .from('releases')
      .select('retailers(*)')
      .eq('id', releaseId)
      .single();
    
    if (error) throw new DatabaseError('Failed to fetch competitor data', error);
    if (!competitors) throw new DatabaseError('Release not found');
    
    return competitors.retailers.map(retailer => ({
      retailer: retailer.name,
      price: retailer.price,
      inStock: checkStock(retailer.stock),
      releaseMethod: retailer.releaseMethod,
      region: retailer.region,
      lastUpdated: new Date(retailer.updatedAt)
    }));
  } catch (error) {
    throw new DatabaseError('Error analyzing competitors', error);
  }
}

export async function predictStock(releaseId: string): Promise<StockPrediction[]> {
  try {
    // Get historical stock data and current demand metrics
    const { data: release, error } = await supabase
      .from('releases')
      .select('*, stock(*), demand(*)')
      .eq('id', releaseId)
      .single();
    
    if (error) throw new DatabaseError('Failed to fetch stock data', error);
    if (!release) throw new DatabaseError('Release not found');
    
    const predictions = release.stock.map(stockItem => {
      const prediction = calculateStockPrediction(
        stockItem,
        release.demand,
        release.releaseMethod
      );
      
      return {
        size: stockItem.size,
        probability: prediction.probability,
        estimatedQuantity: prediction.quantity,
        confidence: prediction.confidence
      };
    });
    
    return predictions;
  } catch (error) {
    throw new DatabaseError('Error predicting stock', error);
  }
}

// Helper functions
function calculatePriceDirection(prices: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (prices.length < 2) return 'stable';
  
  const trend = prices.slice(0, -1).reduce((acc, price, i) => {
    return acc + (prices[i + 1] - price);
  }, 0) / (prices.length - 1);
  
  if (trend > 0.05 * prices[0]) return 'increasing';
  if (trend < -0.05 * prices[0]) return 'decreasing';
  return 'stable';
}

function calculateDemandScore(release: EnhancedRelease): number {
  if (!release.demand) return 0;
  
  const {
    interestScore,
    searchVolume,
    socialMentions,
    pageViews,
    wishlistCount
  } = release.demand;
  
  // Weighted scoring system
  return (
    (interestScore * 0.3) +
    (normalizeMetric(searchVolume) * 0.2) +
    (normalizeMetric(socialMentions) * 0.2) +
    (normalizeMetric(pageViews) * 0.15) +
    (normalizeMetric(wishlistCount) * 0.15)
  );
}

function determineSupplyLevel(release: EnhancedRelease): string {
  if (!release.stock) return 'unknown';
  
  const totalStock = release.stock.reduce((acc, item) => acc + item.quantity, 0);
  const demandScore = release.demand?.interestScore || 50;
  
  if (totalStock === 0) return 'sold_out';
  if (totalStock < demandScore * 0.5) return 'very_low';
  if (totalStock < demandScore) return 'low';
  if (totalStock < demandScore * 2) return 'medium';
  return 'high';
}

function calculateConfidence(dataPoints: number): number {
  // More data points = higher confidence, max 100
  return Math.min(100, (dataPoints / 20) * 100);
}

function checkStock(stock: any[]): boolean {
  return stock?.some(item => item.quantity > 0) ?? false;
}

function normalizeMetric(value: number): number {
  // Normalize values to 0-100 range
  return Math.min(100, (value / 1000) * 100);
}

function calculateStockPrediction(
  stockItem: any,
  demand: any,
  releaseMethod: ReleaseMethod
): { probability: number; quantity: number; confidence: number } {
  // Implement ML-based stock prediction logic
  const baseQuantity = stockItem.quantity || 0;
  const demandFactor = demand?.interestScore ? demand.interestScore / 50 : 1;
  const methodFactor = getMethodFactor(releaseMethod);
  
  return {
    probability: Math.min(100, demandFactor * methodFactor * 100),
    quantity: Math.round(baseQuantity * demandFactor),
    confidence: calculatePredictionConfidence(stockItem, demand)
  };
}

function getMethodFactor(method: ReleaseMethod): number {
  const factors: Record<ReleaseMethod, number> = {
    fcfs: 1.0,
    raffle: 0.8,
    reservation: 0.9,
    queue: 0.85,
    exclusive: 0.6,
    password: 0.7,
    local_only: 0.5
  };
  return factors[method] || 1.0;
}

function calculatePredictionConfidence(stockItem: any, demand: any): number {
  // Calculate confidence based on data quality
  const hasStockHistory = stockItem.history?.length > 0;
  const hasDemandData = !!demand;
  const hasRecentUpdate = new Date(stockItem.lastUpdated).getTime() > Date.now() - 86400000;
  
  let confidence = 50; // Base confidence
  if (hasStockHistory) confidence += 20;
  if (hasDemandData) confidence += 20;
  if (hasRecentUpdate) confidence += 10;
  
  return confidence;
}