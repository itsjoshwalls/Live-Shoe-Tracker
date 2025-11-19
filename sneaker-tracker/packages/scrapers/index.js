import { loadConfig } from './config.js';
import { buildScrapers } from './scrapers/core/utils.js';
import { handleReleases } from './handlers/releaseHandler.js';
import { updateStats } from './handlers/statsHandler.js';
import { sendAlerts } from './handlers/alertHandler.js';
import { ensureRetailerMetadata } from './handlers/retailerHandler.js';
import { recordStockSnapshot } from './handlers/stockHandler.js';

// Simple CLI: node index.js [storeKey]
const main = async () => {
  const config = await loadConfig();
  const storeKey = process.argv[2];
  const scrapers = await buildScrapers(config, storeKey);
  for (const { key, scraper } of scrapers) {
    console.log(`Running scraper: ${key}`);
    try {
      const releases = await scraper.fetchReleases();
      
      // Process each release
      for (const release of releases) {
        // Ensure retailer metadata exists in Firestore (if configured)
        await ensureRetailerMetadata({
          retailerId: key,
          retailerName: release.retailer || key,
          region: release.region,
          apiUrl: release.url,
          rafflePattern: release.rafflePattern
        });
        
        // Record stock snapshots (if stock data available)
        if (release.stock || release.sizes) {
          const stockData = release.stock || (release.sizes && release.sizes.reduce((acc, size) => {
            acc[size] = { total: 1, available: 1 }; // Placeholder, actual scrapers should provide real stock
            return acc;
          }, {}));
          
          if (stockData && release.sku) {
            await recordStockSnapshot(`${key}-${release.sku}`, stockData);
          }
        }
      }
      
      await handleReleases(key, releases);
      await updateStats(key, releases);
      await sendAlerts(key, releases);
      console.log(`✓ ${key}: ${releases.length} releases`);
    } catch (err) {
      console.error(`✗ ${key}:`, err?.message || err);
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
