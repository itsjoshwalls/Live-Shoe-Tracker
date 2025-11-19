import { supabase } from './db';
import { DatabaseError } from './db';
import { EnhancedRelease } from './schemas';
import NodeCache from 'node-cache';

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  factors: string[];
  priceRange: { min: number; max: number };
  seasonalityImpact: number;
}

interface DemandPrediction {
  score: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
  confidence: number;
  segmentAnalysis: {
    region: string;
    score: number;
    factors: string[];
  }[];
}

interface StockPrediction {
  size: string;
  quantity: number;
  confidence: number;
  stockoutRisk: number;
  restockProbability: number;
  optimalInventory: number;
}

interface MarketInsight {
  trend: string;
  confidence: number;
  impactFactors: string[];
  competitorAnalysis: {
    competitor: string;
    marketShare: number;
    trend: string;
  }[];
  marketSegmentation: {
    segment: string;
    size: number;
    growth: number;
  }[];
}

interface SeasonalityAnalysis {
  seasonalPattern: 'high' | 'medium' | 'low';
  peakMonths: string[];
  expectedDemandShift: number;
  confidenceScore: number;
}

export class EnhancedMLService {
  private static instance: EnhancedMLService;
  private modelEndpoint: string;
  private apiKey: string;
  private cache: NodeCache;
  protected supabase = supabase as any;

  protected constructor() {
    this.modelEndpoint = process.env.ML_API_URL || '';
    this.apiKey = process.env.ML_API_KEY || '';
    this.cache = new NodeCache({ stdTTL: 600 }); // 10 minute cache
    this.initializeModels();
  }

  public static getInstance(): EnhancedMLService {
    if (!EnhancedMLService.instance) {
      EnhancedMLService.instance = new EnhancedMLService();
    }
    return EnhancedMLService.instance;
  }

  // Lightweight stubs to be overridden by subclasses if needed
  protected async getReleaseData(releaseId: string): Promise<any> {
    const { data } = await this.supabase.from('releases').select('*').eq('id', releaseId).single();
    return data;
  }

  protected async getMarketData(releaseId: string): Promise<any> {
    const { data } = await this.supabase.from('market_data').select('*').eq('release_id', releaseId);
    return data;
  }

  protected async getDemandData(releaseId: string): Promise<any> {
    const { data } = await this.supabase.from('demand').select('*').eq('release_id', releaseId);
    return data;
  }

  protected interpretClusters(clusters: any, marketData: any): any {
    // simple pass-through; subclasses can provide richer interpretation
    return clusters;
  }

  protected extractPriceFeatures(release: any): any {
    return {
      priceHistory: release.priceHistory || [],
      category: release.category || 'general'
    };
  }

  private async initializeModels(): Promise<void> {
    console.log('Initializing enhanced ML models...');
    // Initialize model weights and configurations
  }

  // Enhanced price prediction with seasonality and market factors
  public async predictPrice(releaseId: string): Promise<PricePrediction> {
    const cacheKey = `price_${releaseId}`;
    const cached = this.cache.get<PricePrediction>(cacheKey);
    if (cached) return cached;

    try {
      const { data: release, error } = await supabase
        .from('releases')
        .select(`
          *,
          priceHistory (*),
          demand (*),
          marketInsights (*)
        `)
        .eq('id', releaseId)
        .single();

      if (error) throw error;

      const features = this.extractPriceFeatures(release);
      const seasonality = await this.analyzeSeasonality(releaseId);
      const prediction = await this.callMLEndpoint('/predict/price/enhanced', {
        ...features,
        seasonality
      });

      const result: PricePrediction = {
        predictedPrice: prediction.price,
        confidence: prediction.confidence,
        factors: prediction.factors,
        priceRange: prediction.range,
        seasonalityImpact: prediction.seasonality_impact
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new DatabaseError('Enhanced price prediction failed', error);
    }
  }

  // Regional market analysis
  public async analyzeRegionalMarket(region: string): Promise<MarketInsight> {
    const cacheKey = `market_${region}`;
    const cached = this.cache.get<MarketInsight>(cacheKey);
    if (cached) return cached;

    try {
      const { data: releases, error } = await supabase
        .from('releases')
        .select('*')
        .eq('region', region);

      if (error) throw error;

      const features = this.extractRegionalFeatures(releases);
      const analysis = await this.callMLEndpoint('/analyze/regional', features);

      const result: MarketInsight = {
        trend: analysis.trend,
        confidence: analysis.confidence,
        impactFactors: analysis.factors,
        competitorAnalysis: analysis.competitors,
        marketSegmentation: analysis.segments
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new DatabaseError('Regional market analysis failed', error);
    }
  }

  // Seasonality analysis
  public async analyzeSeasonality(releaseId: string): Promise<SeasonalityAnalysis> {
    const cacheKey = `seasonality_${releaseId}`;
    const cached = this.cache.get<SeasonalityAnalysis>(cacheKey);
    if (cached) return cached;

    try {
      const { data: release, error } = await supabase
        .from('releases')
        .select(`
          *,
          priceHistory (*),
          demand (*)
        `)
        .eq('id', releaseId)
        .single();

      if (error) throw error;

      const features = this.extractSeasonalityFeatures(release);
      const analysis = await this.callMLEndpoint('/analyze/seasonality', features);

      const result: SeasonalityAnalysis = {
        seasonalPattern: analysis.pattern,
        peakMonths: analysis.peak_months,
        expectedDemandShift: analysis.demand_shift,
        confidenceScore: analysis.confidence
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw new DatabaseError('Seasonality analysis failed', error);
    }
  }

  // Competitor analysis
  public async analyzeCompetitors(releaseId: string): Promise<any> {
    try {
      const { data: competitors, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('releaseId', releaseId);

      if (error) throw error;

      return await this.callMLEndpoint('/analyze/competitors', {
        competitors,
        releaseId
      });
    } catch (error) {
      throw new DatabaseError('Competitor analysis failed', error);
    }
  }

  // Feature extraction helpers
  private extractRegionalFeatures(releases: any[]): any {
    return {
      releases: releases.map(release => ({
        id: release.id,
        price: release.price,
        demand: release.demand,
        region: release.region,
        date: release.releaseDate
      }))
    };
  }

  private extractSeasonalityFeatures(release: any): any {
    return {
      releaseDate: release.releaseDate,
      priceHistory: release.priceHistory,
      demand: release.demand,
      category: release.category
    };
  }

  // Enhanced helper methods with retry logic
  private async callMLEndpoint(path: string, data: any, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${this.modelEndpoint}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`ML API call failed: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
}