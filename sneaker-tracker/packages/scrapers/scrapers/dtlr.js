import { BaseScraper } from './core/baseScraper.js';

export default class DTLRScraper extends BaseScraper {
  constructor() {
    super({ name: 'dtlr', baseUrl: 'https://www.dtlr.com' });
  }
  async fetchReleases() {
    // TODO: Implement DTLR releases/raffles
    return [];
  }
}
