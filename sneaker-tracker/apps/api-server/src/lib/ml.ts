import { supabase } from './db';
import { DatabaseError } from './db';
import { EnhancedRelease } from './schemas';

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  factors: string[];
}

interface DemandPrediction {
  score: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[];
  confidence: number;
}

interface StockPrediction {
  size: string;
  quantity: number;
  confidence: number;
  stockoutRisk: number;
}

export class MLService {
  private static instance: MLService;
  private modelEndpoint: string;
  private apiKey: string;

  private constructor() {
    this.modelEndpoint = process.env.ML_API_URL || '';
    this.apiKey = process.env.ML_API_KEY || '';
    this.initializeModels();
  }

  public static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  private async initializeModels(): Promise<void> {
    // Initialize ML models or connections
    console.log('Initializing ML models...');
  }

  // Price prediction using historical data and market factors
  public async predictPrice(releaseId: string): Promise<PricePrediction> {
    try {
      // Get release data with history
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

      // Prepare features for prediction
      const features = this.extractPriceFeatures(release);

      // Make prediction request
      const prediction = await this.callMLEndpoint('/predict/price', features);

      return {
        predictedPrice: prediction.price,
        confidence: prediction.confidence,
        factors: prediction.factors
      };
    } catch (error) {
      throw new DatabaseError('Price prediction failed', error);
    }
  }

  // Demand prediction using market signals
  public async predictDemand(releaseId: string): Promise<DemandPrediction> {
    try {
      const { data: release, error } = await supabase
        .from('releases')
        .select(`
          *,
          demand (*),
          retailers (*)
        `)
        .eq('id', releaseId)
        .single();

      if (error) throw error;

      const features = this.extractDemandFeatures(release);
      const prediction = await this.callMLEndpoint('/predict/demand', features);

      return {
        score: prediction.score,
        trend: prediction.trend,
        factors: prediction.factors,
        confidence: prediction.confidence
      };
    } catch (error) {
      throw new DatabaseError('Demand prediction failed', error);
    }
  }

  // Stock level prediction by size
  public async predictStock(releaseId: string): Promise<StockPrediction[]> {
    try {
      const { data: release, error } = await supabase
        .from('releases')
        .select(`
          *,
          stock (*),
          demand (*)
        `)
        .eq('id', releaseId)
        .single();

      if (error) throw error;

      const features = this.extractStockFeatures(release);
      const predictions = await this.callMLEndpoint('/predict/stock', features);

      return predictions.map((pred: any) => ({
        size: pred.size,
        quantity: pred.quantity,
        confidence: pred.confidence,
        stockoutRisk: pred.stockout_risk
      }));
    } catch (error) {
      throw new DatabaseError('Stock prediction failed', error);
    }
  }

  // Generate embeddings for semantic search
  public async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await this.callMLEndpoint('/embeddings', { text });
      return response.embedding;
    } catch (error) {
      throw new DatabaseError('Embedding generation failed', error);
    }
  }

  // Market trend analysis
  public async analyzeTrends(timeframe: string = '7d'): Promise<any> {
    try {
      const { data: releases, error } = await supabase
        .from('releases')
        .select('*')
        .gte('releaseDate', new Date(Date.now() - this.getTimeframeMs(timeframe)).toISOString());

      if (error) throw error;

      const features = this.extractTrendFeatures(releases);
      return await this.callMLEndpoint('/analyze/trends', features);
    } catch (error) {
      throw new DatabaseError('Trend analysis failed', error);
    }
  }

  // Feature extraction helpers
  private extractPriceFeatures(release: EnhancedRelease): any {
    return {
      brand: release.brand,
      retailPrice: release.retailPrice,
      priceHistory: release.priceHistory,
      demand: release.demand,
      status: release.status
    };
  }

  private extractDemandFeatures(release: EnhancedRelease): any {
    return {
      brand: release.brand,
      status: release.status,
      retailPrice: release.retailPrice,
      demand: release.demand,
      retailers: release.retailers
    };
  }

  private extractStockFeatures(release: EnhancedRelease): any {
    return {
      brand: release.brand,
      status: release.status,
      stock: release.stock,
      demand: release.demand
    };
  }

  private extractTrendFeatures(releases: EnhancedRelease[]): any {
    return {
      releases: releases.map(release => ({
        brand: release.brand,
        status: release.status,
        retailPrice: release.retailPrice,
        demand: release.demand
      }))
    };
  }

  // Helper methods
  private async callMLEndpoint(path: string, data: any): Promise<any> {
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
      throw new DatabaseError('ML API call failed', error);
    }
  }

  private getTimeframeMs(timeframe: string): number {
    const units: Record<string, number> = {
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };
    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);
    return value * (units[unit] || units['d']);
  }
}