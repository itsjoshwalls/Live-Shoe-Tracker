export class BaseScraper {
  constructor(opts) {
    this.name = opts?.name || 'BaseScraper';
    this.baseUrl = opts?.baseUrl || '';
  }

  async fetchReleases() {
    throw new Error('fetchReleases() not implemented');
  }

  normalizeRelease(r) {
    // Standard shape expected by ingestion workers
    return {
      retailer: this.name,
      name: r.name || r.title,
      sku: r.sku || r.style || null,
      price: r.price ?? null,
      currency: r.currency || 'USD',
      url: r.url,
      imageUrl: r.image || r.imageUrl,
      releaseDate: r.releaseDate || r.launchAt || null,
      status: r.status || 'upcoming',
      locations: r.locations || [],
      sizes: r.sizes || [],
      raw: r
    };
  }
}
