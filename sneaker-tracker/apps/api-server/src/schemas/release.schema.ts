import { z } from 'zod';

export const ReleaseSchema = z.object({
  name: z.string().min(1).max(255),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  releaseDate: z.string().datetime(),
  price: z.number().positive(),
  status: z.enum(['upcoming', 'released', 'delayed', 'cancelled']),
  retailer: z.string().min(1),
  sku: z.string().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  locations: z.array(z.string()).optional(),
  sizes: z.array(
    z.object({
      size: z.string(),
      quantity: z.number().int().min(0),
    })
  ).optional(),
});

export type Release = z.infer<typeof ReleaseSchema>;
export const ReleaseUpdateSchema = ReleaseSchema.partial();