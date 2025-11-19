import { BaseScraper } from './core/baseScraper.js';

export default class JDSportsScraper extends BaseScraper {
  constructor() {
    super({ name: 'jdSports', baseUrl: 'https://www.jdsports.com' });
  }
  async fetchReleases() {
    // TODO: Implement JD Sports releases
    return [];
  }
}
