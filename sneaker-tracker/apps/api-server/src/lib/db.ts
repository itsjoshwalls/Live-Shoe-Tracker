/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// Define a schema for location coordinates
const CoordinatesSchema = z.tuple([
  z.number().describe('Latitude'),
  z.number().describe('Longitude')
]);

// Define a schema for retail location
const LocationSchema = z.object({
  address: z.string(),
  city: z.string(),
  country: z.string(),
  coordinates: CoordinatesSchema.optional()
});

// Release status enum
const ReleaseStatusEnum = z.enum(['upcoming', 'released', 'delayed', 'cancelled'] as const);

// Retailer type enum
const RetailerTypeEnum = z.enum(['online', 'physical', 'hybrid'] as const);

// Release schema with rich validation
export const ReleaseSchema = z.object({
  // Accept numeric IDs from existing rows and coerce to string
  id: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string().optional(),
  // Accept broader ISO8601 datetime variants (RFC3339 with offsets) by relaxing validation
  date: z.string().optional(),
  status: ReleaseStatusEnum.optional(),
  price: z.number().positive().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  retailPrice: z.number().positive().optional(),
  resellPrice: z.number().positive().optional(),
  // Allow null images from DB; normalize to []
  images: z.array(z.string().url('Invalid image URL')).optional().nullable().transform(v => v ?? []),
  colorway: z.string().optional(),
  brand: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Additional fields present in existing table rows
  retailer: z.string().optional(),
  url: z.string().url().optional(),
  release_date: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
}).passthrough();

// Retailer schema with rich validation
export const RetailerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  region: z.string().optional(),
  website: z.string().url('Invalid website URL').optional(),
  type: RetailerTypeEnum.optional(),
  active: z.boolean().optional(),
  locations: z.array(LocationSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

// Infer TypeScript types from Zod schemas
export type Release = z.infer<typeof ReleaseSchema>;
export type ReleaseStatus = z.infer<typeof ReleaseStatusEnum>;
export type Retailer = z.infer<typeof RetailerSchema>;
export type RetailerType = z.infer<typeof RetailerTypeEnum>;
export type Location = z.infer<typeof LocationSchema>;

// Database configuration with alias acceptance and graceful fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accept both SUPABASE_SERVICE_ROLE_KEY and legacy SUPABASE_SERVICE_KEY alias
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envPresenceSummary = {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
};

let supabase: SupabaseClient;
if (supabaseUrl && (supabaseServiceKey || supabaseAnonKey)) {
  const chosenKey = supabaseServiceKey || supabaseAnonKey!;
  logger.info({ msg: 'Supabase initialized', urlPresent: !!supabaseUrl, usingServiceRole: !!supabaseServiceKey, envPresenceSummary });
  supabase = createClient(supabaseUrl, chosenKey);
} else {
  logger.error({ msg: 'Supabase disabled: missing required environment variables', envPresenceSummary });
  // Create a disabled client stub to avoid import-time throws; operations will error when invoked
  const disabledClient: any = {
    from: () => ({
      select: () => ({ data: null, error: new Error('Supabase not configured') }),
      insert: () => ({ data: null, error: new Error('Supabase not configured') }),
      update: () => ({ data: null, error: new Error('Supabase not configured') }),
      delete: () => ({ error: new Error('Supabase not configured') }),
      eq: () => ({ data: null, error: new Error('Supabase not configured') }),
      order: () => ({ data: null, error: new Error('Supabase not configured') }),
      limit: () => ({ data: null, error: new Error('Supabase not configured') }),
      rpc: () => ({ data: null, error: new Error('Supabase not configured') })
    }),
    rpc: () => ({ data: null, error: new Error('Supabase not configured') }),
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe() {} }) }) })
  };
  supabase = disabledClient as SupabaseClient;
}

export { supabase };

// Error handling helper
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Releases
export async function getReleases(): Promise<Release[]> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const { data, error } = await supabase
      .from('releases')
      .select('*');
    if (error) throw new DatabaseError('Failed to fetch releases', error);
    return (data || []).map(normalizeRawRelease);
  } catch (error) {
    throw new DatabaseError('Error processing releases', error);
  }
}

export async function createRelease(payload: Omit<Release, 'id'>): Promise<Release> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const validatedPayload = ReleaseSchema.omit({ id: true }).parse(payload);
    const { data, error } = await supabase
      .from('releases')
      .insert(validatedPayload)
      .select()
      .limit(1);
    if (error) throw new DatabaseError('Failed to create release', error);
    if (!data?.length) return validatedPayload as Release;
    return normalizeRawRelease(data[0]);
  } catch (error) {
    throw new DatabaseError('Error creating release', error);
  }
}

export async function updateRelease(id: string, payload: Partial<Release>): Promise<Release> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const validatedPayload = ReleaseSchema.partial().parse(payload);
    const { data, error } = await supabase
      .from('releases')
      .update(validatedPayload)
      .eq('id', id)
      .select()
      .limit(1);
    if (error) throw new DatabaseError('Failed to update release', error);
    if (!data?.length) return { id, ...validatedPayload } as Release;
    return normalizeRawRelease(data[0]);
  } catch (error) {
    throw new DatabaseError('Error updating release', error);
  }
}

export async function deleteRelease(id: string): Promise<boolean> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const { error } = await supabase
      .from('releases')
      .delete()
      .eq('id', id);
    if (error) throw new DatabaseError('Failed to delete release', error);
    return true;
  } catch (error) {
    throw new DatabaseError('Error deleting release', error);
  }
}

// Retailers
export async function getRetailers(): Promise<Retailer[]> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const { data, error } = await supabase
      .from('retailers')
      .select('*');
    if (error) throw new DatabaseError('Failed to fetch retailers', error);
    return (data || []).map(retailer => RetailerSchema.parse(retailer));
  } catch (error) {
    throw new DatabaseError('Error processing retailers', error);
  }
}

// Normalization helper to adapt legacy/alternative column names to schema expectations
export function normalizeRawRelease(raw: any): Release {
  if (!raw) return raw;
  const mapped = {
    ...raw,
    // Prefer explicit date but fall back to legacy release_date
    date: raw.date || raw.release_date || raw.releaseDate || raw.release_date?.split('T')[0],
    // Ensure images is an array
    images: Array.isArray(raw.images) ? raw.images : (raw.images === null || raw.images === undefined ? [] : [raw.images]).filter(Boolean)
  };
  return ReleaseSchema.parse(mapped);
}

export async function createRetailer(payload: Omit<Retailer, 'id'>): Promise<Retailer> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const validatedPayload = RetailerSchema.omit({ id: true }).parse(payload);
    const { data, error } = await supabase
      .from('retailers')
      .insert(validatedPayload)
      .select()
      .limit(1);
    if (error) throw new DatabaseError('Failed to create retailer', error);
    if (!data?.length) return validatedPayload as Retailer;
    return RetailerSchema.parse(data[0]);
  } catch (error) {
    throw new DatabaseError('Error creating retailer', error);
  }
}

export async function updateRetailer(id: string, payload: Partial<Retailer>): Promise<Retailer> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const validatedPayload = RetailerSchema.partial().parse(payload);
    const { data, error } = await supabase
      .from('retailers')
      .update(validatedPayload)
      .eq('id', id)
      .select()
      .limit(1);
    if (error) throw new DatabaseError('Failed to update retailer', error);
    if (!data?.length) return { id, ...validatedPayload } as Retailer;
    return RetailerSchema.parse(data[0]);
  } catch (error) {
    throw new DatabaseError('Error updating retailer', error);
  }
}

export async function deleteRetailer(id: string): Promise<boolean> {
  if (!envPresenceSummary.SUPABASE_URL) throw new DatabaseError('Supabase not configured (URL missing)');
  try {
    const { error } = await supabase
      .from('retailers')
      .delete()
      .eq('id', id);
    if (error) throw new DatabaseError('Failed to delete retailer', error);
    return true;
  } catch (error) {
    throw new DatabaseError('Error deleting retailer', error);
  }
}
