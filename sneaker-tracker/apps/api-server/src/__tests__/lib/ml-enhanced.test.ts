import { EnhancedMLService } from '../../lib/ml-enhanced';
import { supabase } from '../../lib/db';

jest.mock('../../lib/db', () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe('EnhancedMLService', () => {
  let mlService: EnhancedMLService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ML_API_URL = 'http://test-ml-api';
    process.env.ML_API_KEY = 'test-key';
    mlService = EnhancedMLService.getInstance();
  });

  describe('predictPrice', () => {
    it('should return cached prediction if available', async () => {
      const mockPrediction = {
        predictedPrice: 200,
        confidence: 0.9,
        factors: ['demand', 'seasonality'],
        priceRange: { min: 180, max: 220 },
        seasonalityImpact: 0.1
      };

      // Mock the cache hit
      jest.spyOn(mlService['cache'], 'get').mockReturnValue(mockPrediction);

      const result = await mlService.predictPrice('test-id');
      expect(result).toEqual(mockPrediction);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch and return new prediction if not cached', async () => {
      const mockRelease = {
        id: 'test-id',
        name: 'Test Release',
        price: 150
      };

      const mockPrediction = {
        price: 200,
        confidence: 0.9,
        factors: ['demand'],
        range: { min: 180, max: 220 },
        seasonality_impact: 0.1
      };

      // Mock Supabase query chain
      const mockSelect = jest.fn().mockResolvedValue({
        data: mockRelease,
        error: null
      });
      const mockEq = jest.fn().mockReturnValue({ single: () => mockSelect() });
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({ eq: mockEq })
      } as any);

      // Mock ML API call
      jest.spyOn(mlService as any, 'callMLEndpoint')
        .mockResolvedValue(mockPrediction);

      const result = await mlService.predictPrice('test-id');

      expect(result).toEqual({
        predictedPrice: mockPrediction.price,
        confidence: mockPrediction.confidence,
        factors: mockPrediction.factors,
        priceRange: mockPrediction.range,
        seasonalityImpact: mockPrediction.seasonality_impact
      });
    });

    it('should throw error on database failure', async () => {
      jest.spyOn(supabase, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      } as any);

      await expect(mlService.predictPrice('test-id'))
        .rejects
        .toThrow('Enhanced price prediction failed');
    });
  });

  describe('analyzeRegionalMarket', () => {
    it('should return cached analysis if available', async () => {
      const mockAnalysis = {
        trend: 'increasing',
        confidence: 0.85,
        impactFactors: ['seasonality'],
        competitorAnalysis: [],
        marketSegmentation: []
      };

      jest.spyOn(mlService['cache'], 'get').mockReturnValue(mockAnalysis);

      const result = await mlService.analyzeRegionalMarket('US');
      expect(result).toEqual(mockAnalysis);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    // Add more tests for regional market analysis
  });

  // Add more test suites for other methods
});