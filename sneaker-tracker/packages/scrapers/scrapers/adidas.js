import { BaseScraper } from './core/baseScraper.js';

export default class AdidasScraper extends BaseScraper {
  constructor() {
    super({ name: 'adidas', baseUrl: 'https://www.adidas.com' });
  }
  async fetchReleases() {
    // TODO: Implement CONFIRMED or releases API
    return [];
  }
}
