import { BaseScraper } from './core/baseScraper.js';

export default class FootLockerScraper extends BaseScraper {
  constructor() {
    super({ name: 'footlocker', baseUrl: 'https://www.footlocker.com' });
  }
  async fetchReleases() {
    // TODO: Implement Footlocker launch calendar
    return [];
  }
}
