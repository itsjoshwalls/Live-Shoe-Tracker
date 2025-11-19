import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import NodeCache from 'node-cache';
import { Release, ReleaseSchema, Retailer, RetailerSchema, DatabaseError, supabase } from './db';

// Initialize cache
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes default TTL

// Enhanced Error Types
export class ValidationError extends Error {
  constructor(message: string, public errors: Array<any>) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Advanced Query Interfaces
export interface FilterOperator {
  eq?: any;
  neq?: any;
  gt?: number | string | Date;
  gte?: number | string | Date;
  lt?: number | string | Date;
  lte?: number | string | Date;
  like?: string;
  ilike?: string;
  in?: any[];
  between?: [any, any];
}

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sorts?: SortOption[];
  filters?: Record<string, FilterOperator>;
  search?: {
    fields: string[];
    query: string;
  };
  include?: string[];  // Related data to include
  count?: 'exact' | 'planned' | 'estimated';
  groupBy?: string[];
  having?: Record<string, FilterOperator>;
}

// Advanced Query Functions
export async function getReleasesByQuery(options: QueryOptions): Promise<{ data: Release[]; count?: number }> {
  try {
    // Build the select statement with included relations
    let select = '*';
    if (options.include?.length) {
      select += ',' + options.include.join(',');
    }
    
    let query = supabase.from('releases').select(select, {
      count: options.count
    });
    
    // Apply filters with advanced operators
    if (options.filters) {
      Object.entries(options.filters).forEach(([field, operators]) => {
        Object.entries(operators).forEach(([op, value]) => {
          switch (op) {
            case 'eq':
              query = query.eq(field, value);
              break;
            case 'neq':
              query = query.neq(field, value);
              break;
            case 'gt':
              query = query.gt(field, value);
              break;
            case 'gte':
              query = query.gte(field, value);
              break;
            case 'lt':
              query = query.lt(field, value);
              break;
            case 'lte':
              query = query.lte(field, value);
              break;
            case 'like':
              query = query.like(field, value);
              break;
            case 'ilike':
              query = query.ilike(field, value);
              break;
            case 'in':
              query = query.in(field, value);
              break;
            case 'between':
              query = query.gte(field, value[0]).lte(field, value[1]);
              break;
          }
        });
      });
    }
    
    // Apply full-text search if specified
    if (options.search) {
      const { fields, query: searchQuery } = options.search;
      const textSearchQuery = fields.map(field => 
        `${field}.ilike.%${searchQuery}%`
      ).join(',');
      query = query.or(textSearchQuery);
    }
    
    // Apply sorting with multiple fields support
    if (options.sorts?.length) {
      options.sorts.forEach(sort => {
        query = query.order(sort.field, { 
          ascending: sort.order === 'asc',
          nullsFirst: sort.nullsFirst
        });
      });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    // Apply grouping if specified (use any casts for supabase/grouping features not covered by types)
    if (options.groupBy?.length) {
      // Note: This requires PostgreSQL's group by feature to be enabled
      const groupByClause = options.groupBy.join(',');
      query = (query as any).group_by ? (query as any).group_by(groupByClause) : query;
      
      // Apply having clause if specified
      if (options.having) {
        Object.entries(options.having).forEach(([field, operators]) => {
          Object.entries(operators).forEach(([op, value]) => {
            // Implement having clause operators similar to where clause
            switch (op) {
              case 'eq':
                query = (query as any).having ? (query as any).having(`${field}`, 'eq', value) : query;
                break;
              case 'gt':
                query = (query as any).having ? (query as any).having(`${field}`, 'gt', value) : query;
                break;
              // Add other operators as needed
            }
          });
        });
      }
    }
    
    const { data, error, count } = await (query as any);
    if (error) throw new DatabaseError('Failed to fetch releases', error);
    
    return {
      data: (data || []).map(release => ReleaseSchema.parse(release)),
      count: count ?? undefined
    };
  } catch (error) {
    throw new DatabaseError('Error processing releases', error);
  }
}

// Real-time Types and Interfaces
export type DatabaseChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SubscriptionOptions {
  events?: DatabaseChangeEvent[];
  filter?: {
    field: string;
    value: any;
  };
  shouldSync?: boolean;  // Whether to fetch full state after changes
}

export interface SubscriptionCallbacks {
  onInsert?: (newRecord: Release) => void;
  onUpdate?: (oldRecord: Release, newRecord: Release) => void;
  onDelete?: (oldRecord: Release) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

// Enhanced Real-time Subscription
export function subscribeToReleases(
  options: SubscriptionOptions = {},
  callbacks: SubscriptionCallbacks = {}
) {
  const channelName = `releases-${Date.now()}`;
  let syncTimeout: NodeJS.Timeout;
  
  const subscription = (supabase
    .channel(channelName) as any)
    .on('postgres_changes', 
      { 
        event: options.events || '*',
        schema: 'public',
        table: 'releases',
        filter: options.filter ? `${options.filter.field}=eq.${options.filter.value}` : undefined
      },
      async (payload: any) => {
        try {
          // Clear relevant caches
          cache.del('all_releases');
          if (payload.new?.id) {
            cache.del(`release:${payload.new.id}`);
          }
          
          // Parse records through schema
          const oldRecord = payload.old ? ReleaseSchema.parse(payload.old) : undefined;
          const newRecord = payload.new ? ReleaseSchema.parse(payload.new) : undefined;
          
          // Call appropriate callback
          switch (payload.eventType) {
            case 'INSERT':
              if (newRecord && callbacks.onInsert) {
                callbacks.onInsert(newRecord);
              }
              break;
            case 'UPDATE':
              if (oldRecord && newRecord && callbacks.onUpdate) {
                callbacks.onUpdate(oldRecord, newRecord);
              }
              break;
            case 'DELETE':
              if (oldRecord && callbacks.onDelete) {
                callbacks.onDelete(oldRecord);
              }
              break;
          }
          
          // Handle sync if enabled
          if (options.shouldSync) {
            // Debounce sync to avoid multiple rapid fetches
            clearTimeout(syncTimeout);
            syncTimeout = setTimeout(async () => {
              try {
                const { data } = await getReleasesByQuery({
                  filters: options.filter ? {
                    [options.filter.field]: { eq: options.filter.value }
                  } : undefined
                });
                // Update cache with fresh data
                cache.set('all_releases', data);
              } catch (error) {
                callbacks.onError?.(error as Error);
              }
            }, 100);
          }
        } catch (error) {
          callbacks.onError?.(error as Error);
        }
      }
    )
    .on('error', (error: any) => {
      callbacks.onError?.(error);
    })
    .on('reconnect', () => {
      callbacks.onReconnect?.();
    })
    .subscribe();
  
  // Return an enhanced subscription object with cleanup
  return {
    ...subscription,
    unsubscribe: () => {
      clearTimeout(syncTimeout);
      subscription.unsubscribe();
    }
  };
}

// Batch Operation Types
export interface BatchOperationResult<T> {
  success: T[];
  failures: Array<{
    item: any;
    error: string;
  }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface BatchOptions {
  chunkSize?: number;  // Number of items to process in each batch
  continueOnError?: boolean;  // Whether to continue processing after errors
  validate?: boolean;  // Whether to validate items before processing
  timeout?: number;  // Timeout in ms for each batch
  retryConfig?: {
    maxRetries: number;
    delayMs: number;
    backoffFactor: number;
  };
}

// Enhanced Batch Operations
export async function batchCreateReleases(
  releases: Omit<Release, 'id'>[],
  options: BatchOptions = {}
): Promise<BatchOperationResult<Release>> {
  const result: BatchOperationResult<Release> = {
    success: [],
    failures: [],
    stats: {
      total: releases.length,
      succeeded: 0,
      failed: 0
    }
  };

  const {
    chunkSize = 50,
    continueOnError = true,
    validate = true,
    timeout = 30000,
    retryConfig = {
      maxRetries: 3,
      delayMs: 1000,
      backoffFactor: 2
    }
  } = options;

  // Split releases into chunks
  const chunks: any[] = [];
  for (let i = 0; i < releases.length; i += chunkSize) {
    chunks.push(releases.slice(i, i + chunkSize));
  }

  // Process each chunk
  for (const [chunkIndex, chunk] of chunks.entries()) {
    let retryCount = 0;
    let success = false;

    while (!success && retryCount <= retryConfig.maxRetries) {
      try {
        // Validate chunk items if required
        let validatedChunk: any = chunk;
        if (validate) {
          validatedChunk = chunk.map((release: any) => {
            try {
              return ReleaseSchema.omit({ id: true }).parse(release);
            } catch (error) {
              if (!continueOnError) throw error;
              result.failures.push({
                item: release,
                error: 'Validation failed: ' + (error as Error).message
              });
              result.stats.failed++;
              return null;
            }
          }).filter(Boolean) as any[];
        }

        // Skip empty chunks after validation
        if (validatedChunk.length === 0) {
          break;
        }

        // Process chunk with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Batch operation timed out')), timeout);
        });

        const { data, error } = await Promise.race([
          supabase
            .from('releases')
            .insert(validatedChunk)
            .select(),
          timeoutPromise
        ]) as { data: any; error: any };

        if (error) throw error;

        // Process successful items
        const processed = (data || []).map(release => ReleaseSchema.parse(release));
        result.success.push(...processed);
        result.stats.succeeded += processed.length;

        // Clear relevant caches
        cache.del('all_releases');
        processed.forEach(release => {
          if (release.id) cache.del(`release:${release.id}`);
        });

        success = true;
      } catch (error) {
        retryCount++;
        
        if (retryCount <= retryConfig.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(
              resolve, 
              retryConfig.delayMs * Math.pow(retryConfig.backoffFactor, retryCount - 1)
            )
          );
          continue;
        }

        if (!continueOnError) {
          throw new DatabaseError(
            `Failed to process chunk ${chunkIndex} after ${retryConfig.maxRetries} retries`, 
            error
          );
        }

        // Record failures
        chunk.forEach(release => {
          result.failures.push({
            item: release,
            error: `Failed after ${retryConfig.maxRetries} retries: ${(error as Error).message}`
          });
          result.stats.failed++;
        });
      }
    }
  }

  return result;
}

// Enhanced Validation
export async function createReleaseWithValidation(payload: Omit<Release, 'id'>): Promise<Release> {
  try {
    const validationResult = ReleaseSchema.omit({ id: true }).safeParse(payload);
    if (!validationResult.success) {
      throw new ValidationError('Invalid release data', validationResult.error.issues);
    }
    
    const { data, error } = await supabase
      .from('releases')
      .insert(validationResult.data)
      .select()
      .limit(1);
    
    if (error) throw new DatabaseError('Failed to create release', error);
    if (!data?.length) {
      throw new DatabaseError('No release returned after creation');
    }
    
    cache.del('all_releases'); // Clear cache after creation
    return ReleaseSchema.parse(data[0]);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError('Error creating release', error);
  }
}

// Search and Analytics
export async function searchReleases(query: string): Promise<Release[]> {
  try {
    const { data, error } = await supabase
      .from('releases')
      .select('*')
      .or(`name.ilike.%${query}%, sku.ilike.%${query}%`);
    
    if (error) throw new DatabaseError('Failed to search releases', error);
    return (data || []).map(release => ReleaseSchema.parse(release));
  }
  catch (error) {
    throw new DatabaseError('Error searching releases', error);
  }
}

export async function getReleaseAnalytics(releaseId: string) {
  try {
    const { data, error } = await supabase
      .rpc('calculate_release_metrics', { release_id: releaseId });
      
    if (error) throw new DatabaseError('Failed to get release analytics', error);
    return data;
  } catch (error) {
    throw new DatabaseError('Error getting release analytics', error);
  }
}

// Advanced Caching System

// Cache configuration interface
export interface CacheConfig {
  ttl: number;  // Time to live in seconds
  namespace?: string;
  maxSize?: number;  // Maximum number of items in cache
  updateInterval?: number;  // Background refresh interval
}

// Cache statistics interface
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastUpdated: Date;
  keys: string[];
}

// Initialize cache with sections
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  releases: {
    ttl: 300,  // 5 minutes
    namespace: 'releases',
    maxSize: 1000,
    updateInterval: 60  // 1 minute
  },
  retailers: {
    ttl: 600,  // 10 minutes
    namespace: 'retailers',
    maxSize: 500,
    updateInterval: 120  // 2 minutes
  }
};

const cacheStats: Record<string, CacheStats> = {};

// Initialize cache stats
Object.keys(CACHE_CONFIGS).forEach(key => {
  cacheStats[key] = {
    hits: 0,
    misses: 0,
    size: 0,
    lastUpdated: new Date(),
    keys: []
  };
});

// Background cache updater
function startCacheUpdater(config: CacheConfig, fetcher: () => Promise<any>) {
  setInterval(async () => {
    try {
      const data = await fetcher();
      const cacheKey = `${config.namespace}:all`;
      cache.set(cacheKey, data, config.ttl);
      
      // Update stats
      cacheStats[config.namespace!].lastUpdated = new Date();
      cacheStats[config.namespace!].size = cache.getStats().keys;
      cacheStats[config.namespace!].keys = cache.keys();
    } catch (error) {
      console.error(`Cache update failed for ${config.namespace}:`, error);
    }
  }, config.updateInterval! * 1000);
}

// Enhanced cache getter with automatic pruning
function getCached<T>(key: string, namespace: string): T | null {
  const stats = cacheStats[namespace];
  const config = CACHE_CONFIGS[namespace];
  
  // Prune cache if it exceeds max size
  if (stats.size > config.maxSize!) {
    const keysToRemove = cache.keys()
      .filter(k => k.startsWith(`${namespace}:`))
      .slice(0, Math.floor(config.maxSize! * 0.2)); // Remove 20% of items
    
    keysToRemove.forEach(k => cache.del(k));
  }
  
  const value = cache.get<T>(key);
  if (value !== undefined) {
    stats.hits++;
    return value;
  }
  
  stats.misses++;
  return null;
}

// Advanced cached releases getter
export async function getCachedReleases(
  options?: QueryOptions
): Promise<{ data: Release[]; stats: CacheStats }> {
  const namespace = 'releases';
  const config = CACHE_CONFIGS[namespace];
  
  // Generate cache key based on query options
  const cacheKey = options
    ? `${namespace}:query:${JSON.stringify(options)}`
    : `${namespace}:all`;
  
  // Try to get from cache
  const cached = getCached<Release[]>(cacheKey, namespace);
  if (cached) {
    return {
      data: cached,
      stats: cacheStats[namespace]
    };
  }
  
  // Fetch fresh data
  const query = options
    ? await getReleasesByQuery(options)
    : await supabase.from('releases').select('*');
    
  if ('error' in query && query.error) {
    throw new DatabaseError('Failed to fetch releases', query.error);
  }
  
  const releases = ('data' in query && query.data)
    ? query.data.map(release => ReleaseSchema.parse(release))
    : [];
  
  // Cache the results
  cache.set(cacheKey, releases, config.ttl);
  
  // Update stats
  cacheStats[namespace].lastUpdated = new Date();
  cacheStats[namespace].size = cache.getStats().keys;
  cacheStats[namespace].keys = cache.keys();
  
  return {
    data: releases,
    stats: cacheStats[namespace]
  };
}

// Start background cache updaters
startCacheUpdater(CACHE_CONFIGS.releases, async () => {
  const { data } = await supabase.from('releases').select('*');
  return (data || []).map(release => ReleaseSchema.parse(release));
});

// Batch Operations for Retailers
export async function batchCreateRetailers(retailers: Omit<Retailer, 'id'>[]): Promise<Retailer[]> {
  try {
    const validatedPayloads = retailers.map(r => RetailerSchema.omit({ id: true }).parse(r));
    const { data, error } = await supabase
      .from('retailers')
      .insert(validatedPayloads)
      .select();
    
    if (error) throw new DatabaseError('Failed to create retailers', error);
    cache.del('all_retailers');
    return (data || []).map(retailer => RetailerSchema.parse(retailer));
  } catch (error) {
    throw new DatabaseError('Error creating retailers', error);
  }
}

// Search Retailers
export async function searchRetailers(query: string): Promise<Retailer[]> {
  try {
    const { data, error } = await supabase
      .from('retailers')
      .select('*')
      .or(`name.ilike.%${query}%, region.ilike.%${query}%`);
    
    if (error) throw new DatabaseError('Failed to search retailers', error);
    return (data || []).map(retailer => RetailerSchema.parse(retailer));
  } catch (error) {
    throw new DatabaseError('Error searching retailers', error);
  }
}

// Get Retailers with Query Options
export async function getRetailersByQuery(options: QueryOptions): Promise<{ data: Retailer[]; count?: number }> {
  try {
    // Build the select statement with included relations
    let select = '*';
    if (options.include?.length) {
      select += ',' + options.include.join(',');
    }
    
    let query = supabase.from('retailers').select(select, {
      count: options.count
    });
    
    // Apply filters with advanced operators
    if (options.filters) {
      Object.entries(options.filters).forEach(([field, operators]) => {
        Object.entries(operators).forEach(([op, value]) => {
          switch (op) {
            case 'eq':
              query = query.eq(field, value);
              break;
            case 'neq':
              query = query.neq(field, value);
              break;
            case 'gt':
              query = query.gt(field, value);
              break;
            case 'gte':
              query = query.gte(field, value);
              break;
            case 'lt':
              query = query.lt(field, value);
              break;
            case 'lte':
              query = query.lte(field, value);
              break;
            case 'like':
              query = query.like(field, value);
              break;
            case 'ilike':
              query = query.ilike(field, value);
              break;
            case 'in':
              query = query.in(field, value);
              break;
            case 'between':
              query = query.gte(field, value[0]).lte(field, value[1]);
              break;
          }
        });
      });
    }
    
    // Apply full-text search if specified
    if (options.search) {
      const { fields, query: searchQuery } = options.search;
      const textSearchQuery = fields.map(field => 
        `${field}.ilike.%${searchQuery}%`
      ).join(',');
      query = query.or(textSearchQuery);
    }
    
    // Apply sorting with multiple fields support
    if (options.sorts?.length) {
      options.sorts.forEach(sort => {
        query = query.order(sort.field, { 
          ascending: sort.order === 'asc',
          nullsFirst: sort.nullsFirst
        });
      });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    if (error) throw new DatabaseError('Failed to fetch retailers', error);
    
    return {
      data: (data || []).map(retailer => RetailerSchema.parse(retailer)),
      count: count || undefined
    };
  } catch (error) {
    throw new DatabaseError('Error processing retailers', error);
  }
}