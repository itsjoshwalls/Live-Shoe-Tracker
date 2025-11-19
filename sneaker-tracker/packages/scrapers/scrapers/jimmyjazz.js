import { BaseScraper } from './core/baseScraper.js';
import fetch from 'node-fetch';

export default class JimmyJazzScraper extends BaseScraper {
  constructor() {
    super({ name: 'jimmyjazz', baseUrl: 'https://www.jimmyjazz.com' });
  }

  async fetchReleases() {
    const releases = [];
    const collections = ['sneakers', 'new-arrivals', 'footwear'];

    for (const collection of collections) {
      try {
        const url = `${this.baseUrl}/collections/${collection}/products.json?limit=250`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          for (const product of data.products) {
            if (this.isSneaker(product)) {
              releases.push(this.normalizeRelease({
                name: product.title,
                sku: product.variants?.[0]?.sku || `${product.id}`,
                price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : null,
                url: `${this.baseUrl}/products/${product.handle}`,
                image: product.images?.[0]?.src || null,
                status: product.variants?.some(v => v.available) ? 'available' : 'sold_out',
                locations: [{ name: 'US Chain', type: 'retail', storeCount: 170 }],
                raw: product
              }));
            }
          }
        }
      } catch (err) {
        console.error(`[jimmyjazz] Collection ${collection} failed:`, err.message);
      }
    }

    console.log(`[jimmyjazz] Fetched ${releases.length} releases`);
    return releases;
  }

  isSneaker(product) {
    const text = `${product.title} ${product.product_type} ${product.vendor || ''}`.toLowerCase();
    return /sneaker|shoe|trainer|runner|boot|jordan|nike|adidas|yeezy|new balance|puma/i.test(text);
  }
}
