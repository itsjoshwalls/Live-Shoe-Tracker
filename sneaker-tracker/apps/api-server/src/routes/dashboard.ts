import { Router } from 'express';
import { supabase } from '../lib/db';
import { analyzeMarketTrends, analyzeCompetitors, predictStock } from '../lib/analytics';
import { DatabaseError } from '../lib/db';

const router = Router();

// Real-time market overview
router.get('/market-overview', async (req, res) => {
  try {
    const { data: releases, error: releasesError } = await supabase
      .from('releases')
      .select(`
        *,
        retailers (
          id,
          name,
          type,
          region,
          stock
        ),
        demand
      `)
      .order('releaseDate', { ascending: false })
      .limit(50);

    if (releasesError) throw releasesError;

    // Aggregate market stats
    const marketStats = {
      totalReleases: releases.length,
      byStatus: releases.reduce((acc: any, release) => {
        acc[release.status] = (acc[release.status] || 0) + 1;
        return acc;
      }, {}),
      byRegion: releases.reduce((acc: any, release) => {
        release.retailers.forEach((retailer: any) => {
          acc[retailer.region] = (acc[retailer.region] || 0) + 1;
        });
        return acc;
      }, {}),
      averagePrice: releases.reduce((acc, r) => acc + (r.retailPrice || 0), 0) / releases.length,
      highDemandReleases: releases.filter(r => r.demand?.interestScore > 80).length
    };

    res.json({ releases, marketStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market overview' });
  }
});

// Trending releases dashboard
router.get('/trending', async (req, res) => {
  try {
    const { data: releases, error } = await supabase
      .from('releases')
      .select(`
        *,
        demand,
        priceHistory
      `)
      .order('demand->interestScore', { ascending: false })
      .limit(20);

    if (error) throw error;

    const trendingData = await Promise.all(releases.map(async (release) => {
      const marketTrends = await analyzeMarketTrends(release.id);
      return {
        ...release,
        marketTrends
      };
    }));

    res.json(trendingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending releases' });
  }
});

// Regional insights
router.get('/regional-insights', async (req, res) => {
  try {
    const { data: retailers, error } = await supabase
      .from('retailers')
      .select('*')
      .order('region');

    if (error) throw error;

    const insights = retailers.reduce((acc: any, retailer) => {
      if (!acc[retailer.region]) {
        acc[retailer.region] = {
          totalRetailers: 0,
          byType: {},
          reliability: {
            total: 0,
            count: 0
          }
        };
      }

      acc[retailer.region].totalRetailers++;
      acc[retailer.region].byType[retailer.type] = 
        (acc[retailer.region].byType[retailer.type] || 0) + 1;
      
      if (retailer.reliability?.fulfillmentRate) {
        acc[retailer.region].reliability.total += retailer.reliability.fulfillmentRate;
        acc[retailer.region].reliability.count++;
      }

      return acc;
    }, {});

    // Calculate averages
    Object.values(insights).forEach((region: any) => {
      if (region.reliability.count > 0) {
        region.reliability.average = 
          region.reliability.total / region.reliability.count;
      }
      delete region.reliability.total;
      delete region.reliability.count;
    });

    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regional insights' });
  }
});

// Stock predictions dashboard
router.get('/stock-predictions', async (req, res) => {
  try {
    const { data: releases, error } = await supabase
      .from('releases')
      .select('*')
      .in('status', ['upcoming', 'announced'])
      .order('releaseDate');

    if (error) throw error;

    const predictions = await Promise.all(releases.map(async (release) => {
      const stockPredictions = await predictStock(release.id);
      return {
        ...release,
        predictions: stockPredictions
      };
    }));

    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock predictions' });
  }
});

// Competition analysis
router.get('/competition-analysis', async (req, res) => {
  try {
    const { releaseId } = req.query;
    if (!releaseId) {
      return res.status(400).json({ error: 'Release ID is required' });
    }

    const analysis = await analyzeCompetitors(releaseId as string);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze competition' });
  }
});

export default router;