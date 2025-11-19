import { BaseScraper } from './core/baseScraper.js';

export default class EndClothingScraper extends BaseScraper {
  constructor() {
    super({ name: 'endclothing', baseUrl: 'https://www.endclothing.com' });
  }
  async fetchReleases() {
    // TODO: Implement END. launches/raffles
    return [];
  }
}
