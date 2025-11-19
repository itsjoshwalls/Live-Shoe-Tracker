import axios from 'axios';
import * as cheerio from 'cheerio';
import Bottleneck from 'bottleneck';
import pLimit from 'p-limit';
import { BaseScraper } from './baseScraper.js';

const limiter = new Bottleneck({
  minTime: 300,
  maxConcurrent: 3
});

export const fetchHTML = async (url, options = {}) => {
  const res = await limiter.schedule(() => axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SneakerTrackerBot/1.0)' },
    timeout: 15000,
    ...options
  }));
  return cheerio.load(res.data);
};

export const fetchJSON = async (url, options = {}) => {
  const res = await limiter.schedule(() => axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SneakerTrackerBot/1.0)', 'Accept': 'application/json' },
    timeout: 15000,
    ...options
  }));
  return res.data;
};

export class ShopifyScraper extends BaseScraper {
  constructor({ name, domain, collections }) {
    super({ name, baseUrl: `https://${domain}` });
    this.domain = domain;
    this.collections = Array.isArray(collections) ? collections : null;
  }

  async fetchReleases() {
    // Try per-store collection overrides first, then common handles
    const handles = this.collections && this.collections.length
      ? this.collections
      : ['launch', 'launches', 'new-arrivals', 'new', 'latest', 'footwear'];
    const all = [];
    let found = false;
    for (const h of handles) {
      let page = 1;
      while (page <= 3) { // naive pagination up to 3 pages
        const url = `${this.baseUrl}/collections/${h}/products.json?limit=50&page=${page}`;
        try {
          const data = await fetchJSON(url);
          const products = data?.products || [];
          if (!products.length) break;
          found = true;
          for (const p of products) {
            all.push(this.normalizeRelease({
              name: p.title,
              sku: p.variants?.[0]?.sku || p.handle,
              price: parseFloat(p.variants?.[0]?.price || '0'),
              url: `${this.baseUrl}/products/${p.handle}`,
              image: p.image?.src,
              releaseDate: p.published_at,
              status: 'upcoming'
            }));
          }
          if (products.length < 50) break;
          page += 1;
        } catch (_) {
          break; // collection handle not present
        }
      }
      if (found) break;
    }
    if (!found) {
      // Fallback to full products.json (limited pages)
      let page = 1;
      while (page <= 3) {
        const url = `${this.baseUrl}/products.json?limit=50&page=${page}`;
        const data = await fetchJSON(url);
        const products = data?.products || [];
        if (!products.length) break;
        for (const p of products) {
          all.push(this.normalizeRelease({
            name: p.title,
            sku: p.variants?.[0]?.sku || p.handle,
            price: parseFloat(p.variants?.[0]?.price || '0'),
            url: `${this.baseUrl}/products/${p.handle}`,
            image: p.image?.src,
            releaseDate: p.published_at,
            status: 'upcoming'
          }));
        }
        if (products.length < 50) break;
        page += 1;
      }
    }
    return all;
  }
}

export const buildScrapers = async (config, onlyKey) => {
  const out = [];
  const entries = Object.entries(config.STORES).filter(([k, v]) => v.enabled && (!onlyKey || onlyKey === k));
  for (const [key, s] of entries) {
    if (s.type === 'shopify') {
      out.push({ key, scraper: new ShopifyScraper({ name: key, domain: s.domain, collections: s.collections }) });
    } else {
      // Resolve module path relative to this file (scrapers/core/utils.js)
      let mod = null;
      try {
        const rel = s.module.replace(/^\.\//, '');
        const moduleUrl = new URL(`../../${rel}`, import.meta.url);
        mod = await import(moduleUrl.href);
      } catch (_) { /* ignore */ }
      if (mod?.default) {
        out.push({ key, scraper: new mod.default() });
      } else {
        // Stub fallback
        out.push({ key, scraper: new BaseScraper({ name: key }) });
      }
    }
  }
  return out;
};
