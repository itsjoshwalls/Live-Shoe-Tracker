// StockX Price Integration - Direct implementation using sneaks-api
// Run with: node stockx_prices.js "Air Jordan 1"

const SneaksAPI = require('sneaks-api');
const fs = require('fs');

const sneaks = new SneaksAPI();

// Get command line arguments
const productName = process.argv[2] || 'Air Jordan 1';
const limit = parseInt(process.argv[3]) || 5;

console.log(`\nFetching prices for: ${productName}`);
console.log(`Limit: ${limit}\n`);

sneaks.getProducts(productName, limit, function(err, products) {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    
    console.log(`Found ${products.length} products\n`);
    
    // Save to JSON
    const output = {
        query: productName,
        timestamp: new Date().toISOString(),
        count: products.length,
        products: products
    };
    
    fs.writeFileSync('stockx_prices.json', JSON.stringify(output, null, 2));
    
    // Display summary
    products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.shoeName}`);
        console.log(`   Style: ${product.styleID || 'N/A'}`);
        console.log(`   Retail: $${product.retailPrice || 'N/A'}`);
        
        if (product.lowestResellPrice) {
            const prices = product.lowestResellPrice;
            console.log(`   Resale Prices:`);
            if (prices.stockX) console.log(`     - StockX: $${prices.stockX}`);
            if (prices.goat) console.log(`     - GOAT: $${prices.goat}`);
            if (prices.flightClub) console.log(`     - Flight Club: $${prices.flightClub}`);
            if (prices.stadiumGoods) console.log(`     - Stadium Goods: $${prices.stadiumGoods}`);
        }
        console.log('');
    });
    
    console.log(`Results saved to stockx_prices.json`);
});
