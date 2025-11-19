import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import {
  Release,
  ReleaseSchema,
  Retailer,
  RetailerSchema,
  createRelease,
  createRetailer,
  deleteRelease,
  deleteRetailer,
  getReleases,
  getRetailers,
  updateRelease,
  updateRetailer,
} from '../db';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

describe('Database Layer', () => {
  const mockRelease: Release = {
    name: 'Test Release',
    sku: 'TEST123',
    date: new Date().toISOString(),
    status: 'upcoming',
    price: 199.99,
    currency: 'USD',
  };

  const mockRetailer: Retailer = {
    name: 'Test Store',
    region: 'US',
    website: 'https://test-store.com',
    type: 'online',
    active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Releases', () => {
    it('validates release schema', () => {
      expect(() => ReleaseSchema.parse(mockRelease)).not.toThrow();
      expect(() => ReleaseSchema.parse({ name: '' })).toThrow();
    });

    it('fetches releases', async () => {
      const releases = await getReleases();
      expect(Array.isArray(releases)).toBe(true);
    });

    it('creates a release', async () => {
      await expect(createRelease(mockRelease)).resolves.not.toThrow();
    });

    it('updates a release', async () => {
      await expect(updateRelease('123', { status: 'released' })).resolves.not.toThrow();
    });

    it('deletes a release', async () => {
      await expect(deleteRelease('123')).resolves.toBe(true);
    });

    it('handles invalid release data', async () => {
      const invalidRelease = { name: '', invalid: true };
      await expect(createRelease(invalidRelease as any)).rejects.toThrow();
    });
  });

  describe('Retailers', () => {
    it('validates retailer schema', () => {
      expect(() => RetailerSchema.parse(mockRetailer)).not.toThrow();
      expect(() => RetailerSchema.parse({ name: '' })).toThrow();
    });

    it('fetches retailers', async () => {
      const retailers = await getRetailers();
      expect(Array.isArray(retailers)).toBe(true);
    });

    it('creates a retailer', async () => {
      await expect(createRetailer(mockRetailer)).resolves.not.toThrow();
    });

    it('updates a retailer', async () => {
      await expect(updateRetailer('123', { active: false })).resolves.not.toThrow();
    });

    it('deletes a retailer', async () => {
      await expect(deleteRetailer('123')).resolves.toBe(true);
    });

    it('handles invalid retailer data', async () => {
      const invalidRetailer = { name: '', invalid: true };
      await expect(createRetailer(invalidRetailer as any)).rejects.toThrow();
    });
  });
});