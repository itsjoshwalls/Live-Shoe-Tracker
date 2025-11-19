import { BaseScraper } from './core/baseScraper.js';

export default class myCustomScraper extends BaseScraper {
  constructor() {
    super({ name: 'myCustom', baseUrl: '' });
  }
  async fetchReleases() {
    // TODO: Implement releases fetch for myCustom
    return [];
  }
}
