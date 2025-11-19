import { BaseScraper } from './core/baseScraper.js';

export default class SNKRSScraper extends BaseScraper {
  constructor() {
    super({ name: 'snkrs', baseUrl: 'https://www.nike.com/launch' });
  }
  async fetchReleases() {
    // TODO: Implement SNKRS calendar/launch fetch
    return [];
  }
}
