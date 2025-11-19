import { BaseScraper } from './core/baseScraper.js';

export default class OffspringScraper extends BaseScraper {
  constructor() {
    super({ name: 'offspring', baseUrl: 'https://www.offspring.co.uk' });
  }
  async fetchReleases() {
    // TODO: Implement Offspring launches
    return [];
  }
}
