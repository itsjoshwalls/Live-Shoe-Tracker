import { BaseScraper } from './core/baseScraper.js';

export default class KickzScraper extends BaseScraper {
  constructor() {
    super({ name: 'kickz', baseUrl: 'https://www.kickz.com' });
  }
  async fetchReleases() {
    // TODO: Implement KICKZ launches
    return [];
  }
}
