import { BaseScraper } from './core/baseScraper.js';

export default class HanonScraper extends BaseScraper {
  constructor() {
    super({ name: 'hanon', baseUrl: 'https://www.hanon-shop.com' });
  }
  async fetchReleases() {
    // TODO: Implement Hanon launches
    return [];
  }
}
