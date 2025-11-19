// StockX prices Node.js helper (uses sneaks-api)
const SneaksAPI = require('sneaks-api');
const sneaks = new SneaksAPI();

const sku = process.argv[2];

if (!sku) {
  console.error('Usage: node stockx_prices.cjs <SKU>');
  process.exit(1);
}

sneaks.getProductPrices(sku, (err, product) => {
  if (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
  
  console.log(JSON.stringify(product || {}));
});
