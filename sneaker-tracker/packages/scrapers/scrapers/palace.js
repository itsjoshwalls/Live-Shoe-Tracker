import { BaseScraper } from './core/baseScraper.js';

export default class PalaceScraper extends BaseScraper {
  constructor() {
    super({ name: 'palace', baseUrl: 'https://www.palaceskateboards.com' });
  }
  async fetchReleases() {
    // TODO: Implement Palace drops
    return [];
  }
}
