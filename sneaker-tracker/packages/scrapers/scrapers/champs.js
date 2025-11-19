import { BaseScraper } from './core/baseScraper.js';

export default class ChampsScraper extends BaseScraper {
  constructor() {
    super({ name: 'champs', baseUrl: 'https://www.champssports.com' });
  }
  async fetchReleases() {
    // TODO: Implement Champs releases
    return [];
  }
}
