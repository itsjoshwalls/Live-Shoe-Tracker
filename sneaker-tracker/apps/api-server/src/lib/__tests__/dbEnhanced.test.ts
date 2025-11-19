import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getReleasesByQuery,
  searchReleases,
  getReleaseAnalytics,
  getCachedReleases,
  batchCreateReleases,
  ValidationError
} from '../dbEnhanced';

jest.mock('@supabase/supabase-js');

describe('Enhanced Database Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReleasesByQuery', () => {
    it('should fetch releases with query options', async () => {
      const options = {
        limit: 10,
        offset: 0,
        sortBy: 'name',
        sortOrder: 'asc' as const,
        filters: { status: { eq: 'upcoming' } }
      };

      const releases = await getReleasesByQuery(options);
      expect(Array.isArray(releases)).toBe(true);
    });
  });

  describe('searchReleases', () => {
    it('should search releases by query string', async () => {
      const query = 'Nike Air';
      const releases = await searchReleases(query);
      expect(Array.isArray(releases)).toBe(true);
    });
  });

  describe('getReleaseAnalytics', () => {
    it('should fetch analytics for a release', async () => {
      const releaseId = '123';
      const analytics = await getReleaseAnalytics(releaseId);
      expect(analytics).toBeDefined();
    });
  });

  describe('getCachedReleases', () => {
    it('should return cached releases when available', async () => {
      const releases = await getCachedReleases();
      expect(Array.isArray(releases)).toBe(true);
      
      // Should use cache on second call
      const cachedReleases = await getCachedReleases();
      expect(Array.isArray(cachedReleases)).toBe(true);
    });
  });

  describe('batchCreateReleases', () => {
    it('should create multiple releases', async () => {
      const releases = [
        {
          name: 'Test Release 1',
          status: 'upcoming' as const,
          price: 199.99,
        },
        {
          name: 'Test Release 2',
          status: 'upcoming' as const,
          price: 149.99,
        }
      ];

      const created = await batchCreateReleases(releases);
      expect(Array.isArray(created)).toBe(true);
      expect(created).toHaveLength(2);
    });

    it('should validate all releases before creation', async () => {
      const invalidReleases = [
        { name: '', price: -100 }, // Invalid
        { name: 'Valid', price: 100 } // Valid
      ];

      await expect(batchCreateReleases(invalidReleases)).rejects.toThrow();
    });
  });
});