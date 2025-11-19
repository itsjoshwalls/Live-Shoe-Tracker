import { Router } from 'express';
import { supabase } from '../lib/db';
import { DatabaseError } from '../lib/db';
import { EnhancedRelease, ReleaseStatus } from '../lib/schemas';

const router = Router();

// Advanced search parameters interface
interface SearchParams {
  query?: string;
  brands?: string[];
  priceRange?: { min?: number; max?: number };
  releaseDate?: { from?: string; to?: string };
  status?: ReleaseStatus[];
  regions?: string[];
  inStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeRetailers?: boolean;
  includeDemand?: boolean;
}

// Full-text search with filters
router.post('/search', async (req, res) => {
  try {
    const params: SearchParams = req.body;
    
    // Build base query
    let query = supabase
      .from('releases')
      .select(`
        *,
        ${params.includeRetailers ? 'retailers (*),' : ''}
        ${params.includeDemand ? 'demand (*),' : ''}
        stock (*)
      `);

    // Apply full-text search if query provided
    if (params.query) {
      query = query.textSearch('name', params.query, {
        config: 'english',
        type: 'websearch'
      });
    }

    // Apply filters
    if (params.brands?.length) {
      query = query.in('brand', params.brands);
    }

    if (params.priceRange) {
      if (params.priceRange.min) {
        query = query.gte('retailPrice', params.priceRange.min);
      }
      if (params.priceRange.max) {
        query = query.lte('retailPrice', params.priceRange.max);
      }
    }

    if (params.releaseDate) {
      if (params.releaseDate.from) {
        query = query.gte('releaseDate', params.releaseDate.from);
      }
      if (params.releaseDate.to) {
        query = query.lte('releaseDate', params.releaseDate.to);
      }
    }

    if (params.status?.length) {
      query = query.in('status', params.status);
    }

    if (params.regions?.length && params.includeRetailers) {
      query = query.filter('retailers.region', 'in', `(${params.regions.join(',')})`);
    }

    if (params.inStock) {
      query = query.gt('stock.quantity', 0);
    }

    // Apply sorting
    if (params.sortBy) {
      query = query.order(params.sortBy, {
        ascending: params.sortOrder === 'asc'
      });
    }

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data: releases, error, count } = await query;

    if (error) throw error;

    res.json({
      releases,
      count,
      params
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Semantic search using embeddings
router.post('/semantic-search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    // Get embeddings for the query (implement your preferred embedding service)
    const queryEmbedding = await getEmbedding(query);

    // Perform vector similarity search
    const { data: releases, error } = await supabase
      .rpc('match_releases', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit
      });

    if (error) throw error;

    res.json(releases);
  } catch (error) {
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

// Similar releases (ML-based)
router.get('/similar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get release details
    const { data: release, error } = await supabase
      .from('releases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get similar releases based on embeddings
    const { data: similar, error: similarError } = await supabase
      .rpc('find_similar_releases', {
        reference_id: id,
        match_count: 5
      });

    if (similarError) throw similarError;

    res.json({
      reference: release,
      similar
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to find similar releases' });
  }
});

// Trending search terms
router.get('/trending-searches', async (req, res) => {
  try {
    const { data: searches, error } = await supabase
      .from('search_logs')
      .select('query, count')
      .order('count', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json(searches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending searches' });
  }
});

// Helper function for embeddings (implement your preferred service)
async function getEmbedding(text: string): Promise<number[]> {
  // Implement your embedding logic here
  // Example: Use OpenAI's embedding API
  return [];
}

export default router;