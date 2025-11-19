// Resale Marketplace Scrapers
// Sources: StockX, GOAT, Flight Club, Stadium Goods, eBay
// Path: functions/src/scrapers/resaleMarketplaces.js

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * 1. STOCKX ENHANCED SCRAPER
 * Market prices, velocity, demand signals
 */
export async function scrapeStockXEnhanced() {
  const products = [];
  
  try {
    // StockX Browse API (publicly accessible)
    const apiUrl = 'https://stockx.com/api/browse?productCategory=sneakers&page=1&limit=100&sort=release_date&order=DESC';
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'apollographql-client-name': 'Iron',
        'apollographql-client-version': '2022.08.12.00',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      for (const item of data.Products || []) {
        products.push({
          retailerId: 'stockx',
          retailerName: 'StockX',
          productName: item.title || item.name,
          brand: item.brand || extractBrand(item.title),
          sku: item.styleId,
          colorway: item.colorway,
          releaseDate: item.releaseDate,
          retailPrice: item.retailPrice,
          
          // Resale data
          lowestAsk: item.market?.lowestAsk,
          highestBid: item.market?.highestBid,
          lastSale: item.market?.lastSale,
          salesLast72Hours: item.market?.salesLast72Hours,
          volatility: item.market?.volatility,
          deadstockSold: item.market?.deadstockSold,
          pricePremium: item.market?.pricePremium,
          averageDeadstockPrice: item.market?.averageDeadstockPrice,
          
          // Demand signals
          numberOfAsks: item.market?.numberOfAsks,
          numberOfBids: item.market?.numberOfBids,
          
          imageUrl: item.media?.imageUrl,
          productUrl: `https://stockx.com/${item.urlKey}`,
          source: 'stockx_api',
          lastChecked: new Date().toISOString(),
        });
      }
    }
    
    console.log(`✅ StockX Enhanced: Scraped ${products.length} products with market data`);
  } catch (error) {
    console.error('❌ StockX Enhanced scraper error:', error.message);
  }
  
  return products;
}

/**
 * 2. GOAT SCRAPER
 * Resale marketplace data
 */
export async function scrapeGOAT() {
  const products = [];
  
  try {
    // GOAT GraphQL API (inspect network tab on goat.com)
    const apiUrl = 'https://www.goat.com/web-api/v1/product_variants/buy_bar_data';
    
    // Alternative: scrape new arrivals page
    const htmlUrl = 'https://www.goat.com/sneakers?page=1';
    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // GOAT uses React hydration - look for __NEXT_DATA__ script
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript);
      const productData = nextData.props?.pageProps?.products || [];
      
      for (const item of productData) {
        products.push({
          retailerId: 'goat',
          retailerName: 'GOAT',
          productName: item.name,
          brand: item.brand_name,
          sku: item.sku,
          colorway: item.color,
          releaseDate: item.release_date,
          retailPrice: item.retail_price_cents / 100,
          
          // Resale data
          lowestPrice: item.lowest_price_cents / 100,
          instantShipLowestPrice: item.instant_ship_lowest_price_cents / 100,
          
          imageUrl: item.grid_picture_url,
          productUrl: `https://www.goat.com/sneakers/${item.slug}`,
          source: 'goat',
          lastChecked: new Date().toISOString(),
        });
      }
    }
    
    console.log(`✅ GOAT: Scraped ${products.length} products`);
  } catch (error) {
    console.error('❌ GOAT scraper error:', error.message);
  }
  
  return products;
}

/**
 * 3. FLIGHT CLUB SCRAPER
 * Consignment marketplace
 */
export async function scrapeFlightClub() {
  const products = [];
  
  try {
    const url = 'https://www.flightclub.com/new-arrivals';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.product-tile, .product-card').each((i, elem) => {
      const $elem = $(elem);
      
      const name = $elem.find('.product-name, h3').text().trim();
      const price = $elem.find('.price').text().trim();
      
      if (name) {
        products.push({
          retailerId: 'flight_club',
          retailerName: 'Flight Club',
          productName: name,
          brand: extractBrand(name),
          sku: $elem.find('.sku').text().trim() || extractSKU(name),
          lowestPrice: parsePrice(price),
          imageUrl: $elem.find('img').attr('src'),
          productUrl: 'https://www.flightclub.com' + $elem.find('a').attr('href'),
          source: 'flight_club',
          lastChecked: new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ Flight Club: Scraped ${products.length} products`);
  } catch (error) {
    console.error('❌ Flight Club scraper error:', error.message);
  }
  
  return products;
}

/**
 * 4. STADIUM GOODS SCRAPER
 */
export async function scrapeStadiumGoods() {
  const products = [];
  
  try {
    const url = 'https://www.stadiumgoods.com/sneakers';
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.product-item, .product-card').each((i, elem) => {
      const $elem = $(elem);
      
      products.push({
        retailerId: 'stadium_goods',
        retailerName: 'Stadium Goods',
        productName: $elem.find('.product-name').text().trim(),
        brand: extractBrand($elem.find('.product-name').text()),
        lowestPrice: parsePrice($elem.find('.price').text()),
        imageUrl: $elem.find('img').attr('src'),
        productUrl: $elem.find('a').attr('href'),
        source: 'stadium_goods',
        lastChecked: new Date().toISOString(),
      });
    });
    
    console.log(`✅ Stadium Goods: Scraped ${products.length} products`);
  } catch (error) {
    console.error('❌ Stadium Goods scraper error:', error.message);
  }
  
  return products;
}

/**
 * 5. EBAY SNEAKERS SCRAPER
 * Sold listings for historical pricing
 */
export async function scrapeEbaySneakers() {
  const products = [];
  
  try {
    // Search for recently sold sneakers
    const url = 'https://www.ebay.com/sch/i.html?_nkw=sneakers&_sacat=15709&LH_Sold=1&LH_Complete=1&_sop=13';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.s-item').each((i, elem) => {
      const $elem = $(elem);
      
      const title = $elem.find('.s-item__title').text().trim();
      const soldPrice = $elem.find('.s-item__price').text().trim();
      const soldDate = $elem.find('.s-item__ended-date').text().trim();
      
      if (title && title !== 'Shop on eBay') {
        products.push({
          retailerId: 'ebay_sneakers',
          retailerName: 'eBay',
          productName: title,
          brand: extractBrand(title),
          sku: extractSKU(title),
          soldPrice: parsePrice(soldPrice),
          soldDate: soldDate,
          imageUrl: $elem.find('.s-item__image-img').attr('src'),
          productUrl: $elem.find('.s-item__link').attr('href'),
          source: 'ebay_sold',
          lastChecked: new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ eBay: Scraped ${products.length} sold listings`);
  } catch (error) {
    console.error('❌ eBay scraper error:', error.message);
  }
  
  return products;
}

/**
 * UTILITY FUNCTIONS
 */

function extractBrand(title) {
  const brands = {
    'nike': 'Nike',
    'jordan': 'Jordan',
    'adidas': 'Adidas',
    'yeezy': 'Adidas',
    'new balance': 'New Balance',
    'asics': 'Asics',
    'puma': 'Puma',
    'reebok': 'Reebok',
    'converse': 'Converse',
    'vans': 'Vans',
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [key, value] of Object.entries(brands)) {
    if (lowerTitle.includes(key)) return value;
  }
  return 'Unknown';
}

function extractSKU(title) {
  const skuMatch = title.match(/\b([A-Z]{2,3}\d{4}[-\s]?\d{3})\b/);
  return skuMatch ? skuMatch[1] : null;
}

function parsePrice(priceText) {
  if (!priceText) return null;
  const match = priceText.match(/[\$€£]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

/**
 * MASTER RESALE SCRAPER RUNNER
 */
export async function runAllResaleScrapers() {
  console.log('🚀 Starting resale marketplace scrapers...');
  
  const results = {
    total: 0,
    bySource: {},
    errors: [],
  };
  
  const scrapers = [
    { name: 'StockX Enhanced', fn: scrapeStockXEnhanced },
    { name: 'GOAT', fn: scrapeGOAT },
    { name: 'Flight Club', fn: scrapeFlightClub },
    { name: 'Stadium Goods', fn: scrapeStadiumGoods },
    { name: 'eBay', fn: scrapeEbaySneakers },
  ];
  
  for (const { name, fn } of scrapers) {
    try {
      const products = await fn();
      results.bySource[name] = products.length;
      results.total += products.length;
    } catch (error) {
      results.errors.push({ source: name, error: error.message });
    }
  }
  
  console.log('✅ Resale scrapers complete:', results);
  return results;
}
