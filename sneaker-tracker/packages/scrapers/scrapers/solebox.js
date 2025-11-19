import { BaseScraper } from './core/baseScraper.js';

export default class SoleboxScraper extends BaseScraper {
  constructor() {
    super({ name: 'solebox', baseUrl: 'https://www.solebox.com' });
  }
  async fetchReleases() {
    // TODO: Implement Solebox launches
    return [];
  }
}
