import { BaseScraper } from './core/baseScraper.js';

export default class ShoePalaceScraper extends BaseScraper {
  constructor() {
    super({ name: 'shoepalace', baseUrl: 'https://www.shoepalace.com' });
  }
  async fetchReleases() {
    // TODO: Implement Shoe Palace releases
    return [];
  }
}
