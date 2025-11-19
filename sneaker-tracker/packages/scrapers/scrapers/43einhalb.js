import { BaseScraper } from './core/baseScraper.js';
import fetch from 'node-fetch';

export default class EinhalbScraper extends BaseScraper {
  constructor() {
    super({ name: 'einhalb43', baseUrl: 'https://www.43einhalb.com' });
  }

  async fetchReleases() {
    const releases = [];
    const collections = ['sneakers', 'new-releases', 'footwear'];

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
                currency: 'EUR',
                locations: [{ name: 'Fulda, Germany', type: 'flagship', region: 'EU' }],
                raw: product
              }));
            }
          }
        }
      } catch (err) {
        console.error(`[einhalb43] Collection ${collection} failed:`, err.message);
      }
    }

    console.log(`[einhalb43] Fetched ${releases.length} releases`);
    return releases;
  }

  isSneaker(product) {
    const text = `${product.title} ${product.product_type} ${product.vendor || ''}`.toLowerCase();
    return /sneaker|schuh|shoe|trainer|runner|boot|jordan|nike|adidas|yeezy|new balance|asics/i.test(text);
  }
}
