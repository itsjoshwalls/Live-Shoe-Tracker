import { BaseScraper } from './core/baseScraper.js';

export default class SNSScraper extends BaseScraper {
  constructor() {
    super({ name: 'sneakersnstuff', baseUrl: 'https://www.sneakersnstuff.com' });
  }
  async fetchReleases() {
    // TODO: Implement SNS launches/raffles
    return [];
  }
}
