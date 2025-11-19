import { z } from 'zod';

// Enhanced coordinates schema with validation
const CoordinatesSchema = z.tuple([
  z.number().min(-90).max(90).describe('Latitude'),
  z.number().min(-180).max(180).describe('Longitude')
]);

// Size systems
const SizeSystemEnum = z.enum(['US', 'UK', 'EU', 'CM', 'MM'] as const);

// Size mapping schema
const SizeMappingSchema = z.record(SizeSystemEnum, z.number());

// Price history entry
const PriceHistoryEntrySchema = z.object({
  date: z.string().datetime(),
  price: z.number().positive(),
  currency: z.string().length(3),
  source: z.string(),
  type: z.enum(['retail', 'resell', 'auction', 'private']),
});

// Stock level tracking
const StockLevelSchema = z.object({
  size: z.string(),
  quantity: z.number().min(0),
  lastUpdated: z.string().datetime(),
  location: z.string().optional(),
});

// Demand metrics
const DemandMetricsSchema = z.object({
  interestScore: z.number().min(0).max(100),
  searchVolume: z.number().min(0),
  socialMentions: z.number().min(0),
  pageViews: z.number().min(0),
  wishlistCount: z.number().min(0),
  lastUpdated: z.string().datetime(),
});

// Advanced location schema
const LocationSchema = z.object({
  address: z.string(),
  city: z.string(),
  country: z.string(),
  coordinates: CoordinatesSchema.optional(),
  storeHours: z.record(z.string(), z.string()).optional(), // e.g., "Monday": "9:00-17:00"
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    social: z.record(z.string(), z.string()).optional(),
  }).optional(),
  features: z.array(z.string()).optional(), // e.g., ["raffle-system", "reservation-required"]
});

// Enhanced release status with more states
const ReleaseStatusEnum = z.enum([
  'announced',
  'upcoming',
  'raffle_open',
  'raffle_closed',
  'released',
  'restock_soon',
  'restocked',
  'sold_out',
  'delayed',
  'cancelled',
  'region_locked'
] as const);

// Release method types
const ReleaseMethodEnum = z.enum([
  'fcfs', // First come, first served
  'raffle',
  'reservation',
  'queue',
  'exclusive',
  'password',
  'local_only'
] as const);

// Enhanced retailer types
const RetailerTypeEnum = z.enum([
  'online',
  'physical',
  'hybrid',
  'boutique',
  'department_store',
  'brand_direct',
  'marketplace',
  'consignment'
] as const);

// Raffle details schema
const RaffleDetailsSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  drawTime: z.string().datetime().optional(),
  entryMethod: z.enum(['online', 'in_store', 'hybrid']),
  requirements: z.array(z.string()),
  restrictions: z.array(z.string()).optional(),
  shipmentRegions: z.array(z.string()).optional(),
});

// Authentication requirements
const AuthRequirementsSchema = z.object({
  type: z.enum(['none', 'account', 'membership', 'invitation']),
  details: z.string().optional(),
  signupUrl: z.string().url().optional(),
});

// Media assets
const MediaAssetSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'video', '360', 'ar']),
  thumbnail: z.string().url().optional(),
  order: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// Enhanced release schema
export const EnhancedReleaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string(),
  style: z.string().optional(),
  colorway: z.string().optional(),
  nickname: z.string().optional(),
  
  // Brand and collection info
  brand: z.string(),
  collection: z.string().optional(),
  category: z.string().optional(),
  gender: z.enum(['men', 'women', 'unisex', 'kids', 'toddler']).optional(),
  
  // Release details
  releaseDate: z.string().datetime(),
  status: ReleaseStatusEnum,
  releaseMethod: ReleaseMethodEnum.optional(),
  raffleDetails: RaffleDetailsSchema.optional(),
  authRequirements: AuthRequirementsSchema.optional(),
  
  // Pricing
  retailPrice: z.number().positive(),
  currency: z.string().length(3),
  resellPrice: z.number().positive().optional(),
  priceHistory: z.array(PriceHistoryEntrySchema).optional(),
  
  // Sizing and stock
  sizeRange: z.object({
    system: SizeSystemEnum,
    min: z.number(),
    max: z.number(),
    increment: z.number(),
  }),
  sizeMappings: SizeMappingSchema.optional(),
  stock: z.array(StockLevelSchema).optional(),
  
  // Media
  media: z.array(MediaAssetSchema),
  
  // Market data
  demand: DemandMetricsSchema.optional(),
  
  // Retailers and locations
  retailers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().optional(),
    stock: z.array(StockLevelSchema).optional(),
    releaseMethod: ReleaseMethodEnum.optional(),
    url: z.string().url().optional(),
  })),
  
  // Additional details
  description: z.string().optional(),
  materials: z.array(z.string()).optional(),
  technology: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  
  // Metadata and tracking
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

// Enhanced retailer schema
export const EnhancedRetailerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  type: RetailerTypeEnum,
  region: z.string(),
  
  // Online presence
  website: z.string().url().optional(),
  platforms: z.array(z.object({
    type: z.enum(['web', 'ios', 'android']),
    url: z.string().url(),
  })).optional(),
  
  // Physical presence
  locations: z.array(LocationSchema).optional(),
  
  // Business details
  businessHours: z.record(z.string(), z.string()).optional(),
  shippingRegions: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  
  // Release capabilities
  supportedReleaseMethods: z.array(ReleaseMethodEnum),
  requiresAuthentication: z.boolean().default(false),
  membershipOptions: z.array(z.object({
    name: z.string(),
    benefits: z.array(z.string()),
    cost: z.number().optional(),
  })).optional(),
  
  // Status and reliability
  active: z.boolean().default(true),
  reliability: z.object({
    uptime: z.number().min(0).max(100).optional(),
    fulfillmentRate: z.number().min(0).max(100).optional(),
    botProtection: z.boolean().optional(),
    lastIncident: z.string().datetime().optional(),
  }).optional(),
  
  // Integration details
  apiEndpoint: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  
  // Tracking
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

// Export types
export type EnhancedRelease = z.infer<typeof EnhancedReleaseSchema>;
export type EnhancedRetailer = z.infer<typeof EnhancedRetailerSchema>;
export type ReleaseStatus = z.infer<typeof ReleaseStatusEnum>;
export type ReleaseMethod = z.infer<typeof ReleaseMethodEnum>;
export type RetailerType = z.infer<typeof RetailerTypeEnum>;
export type SizeSystem = z.infer<typeof SizeSystemEnum>;