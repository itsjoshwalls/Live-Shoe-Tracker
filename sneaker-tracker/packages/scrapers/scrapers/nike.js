import { BaseScraper } from './core/baseScraper.js';

export default class NikeScraper extends BaseScraper {
  constructor() {
    super({ name: 'nike', baseUrl: 'https://www.nike.com' });
  }
  async fetchReleases() {
    // TODO: Use Nike Product Feed or Storefront backend; requires auth/client hints
    return [];
  }
}
