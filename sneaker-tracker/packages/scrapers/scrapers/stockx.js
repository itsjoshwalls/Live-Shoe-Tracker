import { BaseScraper } from './core/baseScraper.js';

export default class StockXScraper extends BaseScraper {
  constructor() {
    super({ name: 'stockx', baseUrl: 'https://stockx.com' });
  }
  async fetchReleases() {
    // Note: Scraping StockX is restricted by their ToS. Keep this as a placeholder.
    return [];
  }
}
