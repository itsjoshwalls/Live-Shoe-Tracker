import { BaseScraper } from './core/baseScraper.js';

export default class SizeOfficialScraper extends BaseScraper {
  constructor() {
    super({ name: 'sizeOfficial', baseUrl: 'https://www.size.co.uk' });
  }
  async fetchReleases() {
    // TODO: Implement size? launches
    return [];
  }
}
