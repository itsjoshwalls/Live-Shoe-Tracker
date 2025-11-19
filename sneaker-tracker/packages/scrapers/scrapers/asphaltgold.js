import { BaseScraper } from './core/baseScraper.js';

export default class AsphaltgoldScraper extends BaseScraper {
  constructor() {
    super({ name: 'asphaltgold', baseUrl: 'https://www.asphaltgold.com' });
  }
  async fetchReleases() {
    // TODO: Implement Asphaltgold launches
    return [];
  }
}
