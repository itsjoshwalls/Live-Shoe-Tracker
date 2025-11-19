/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
/*
 * API Route: /api/releases
 * Secure server-side proxy for Postgres/Supabase reads
 * Uses service role key (not exposed to client) with RLS enabled
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ReleaseRow = {
  id: number;
  url: string;
  title?: string;
  brand?: string;
  price?: string | number;
  status?: string;
  release_date?: string;
  sku?: string;
  image_url?: string;
  source?: string;
  scraped_at?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase configuration in API route');
    return res.status(500).json({
      error: 'Server configuration error',
      detail: 'Supabase credentials not configured',
    });
  }

  try {
    // Parse query params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const brand = req.query.brand as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    // Create server-side Supabase client with service role
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Build query
    let query = supabase
      .from('soleretriever_data')
      .select('id,url,title,brand,price,status,release_date,sku,image_url,source,scraped_at', { count: 'exact' })
      .order('scraped_at', { ascending: false });

    // Apply filters
    if (brand) {
      query = query.eq('brand', brand);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        detail: error.message,
      });
    }

    return res.status(200).json({
      data: data as ReleaseRow[],
      count: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('API route error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      detail: err.message || 'Unknown error',
    });
  }
}
