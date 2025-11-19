import { BaseScraper } from './core/baseScraper.js';

export default class FinishlineScraper extends BaseScraper {
  constructor() {
    super({ name: 'finishline', baseUrl: 'https://www.finishline.com' });
  }
  async fetchReleases() {
    // TODO: Implement Finishline releases
    return [];
  }
}
