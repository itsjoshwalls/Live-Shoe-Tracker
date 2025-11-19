import { BaseScraper } from './core/baseScraper.js';

export default class HibbetsScraper extends BaseScraper {
  constructor() {
    super({ name: 'hibbets', baseUrl: 'https://www.hibbett.com' });
  }
  async fetchReleases() {
    // TODO: Implement Hibbett releases
    return [];
  }
}
