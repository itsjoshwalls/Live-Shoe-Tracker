// Release Aggregator Scrapers
// Primary sources: SoleLinks, Sole Retriever, Sneaktorious, Sneaker News
// Path: functions/src/scrapers/releaseAggregators.js

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * 1. SOLELINKS SCRAPER
 * Release calendar + restock links
 * URL: https://www.solelinks.com/releases/
 */
export async function scrapeSoleLinks() {
  const releases = [];
  
  try {
    // Try mobile API endpoint first (more structured)
    const apiUrl = 'https://www.solelinks.com/api/releases?page=1&limit=100';
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Accept': 'application/json',
      },
    });
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      
      for (const item of data.releases || data.data || []) {
        releases.push({
          retailerId: 'solelinks_aggregator',
          retailerName: 'SoleLinks',
          productName: item.title || item.name,
          brand: extractBrand(item.title || item.name),
          sku: item.sku || item.style_code,
          price: parsePrice(item.price),
          releaseDate: item.release_date || item.date,
          status: mapStatus(item.status),
          imageUrl: item.image || item.thumbnail,
          productUrl: item.url || item.link,
          retailerLinks: item.stores || item.retailers || [],
          source: 'solelinks_api',
        });
      }
    } else {
      // Fallback to HTML scraping
      const htmlUrl = 'https://www.solelinks.com/releases/';
      const htmlResponse = await fetch(htmlUrl);
      const html = await htmlResponse.text();
      const $ = cheerio.load(html);
      
      $('.release-item, .product-card').each((i, elem) => {
        const $elem = $(elem);
        
        releases.push({
          retailerId: 'solelinks_aggregator',
          retailerName: 'SoleLinks',
          productName: $elem.find('.product-name, .title').text().trim(),
          brand: extractBrand($elem.find('.product-name, .title').text()),
          sku: $elem.find('.sku, .style-code').text().trim(),
          price: parsePrice($elem.find('.price').text()),
          releaseDate: $elem.find('.release-date, .date').text().trim(),
          status: mapStatus($elem.find('.status').text()),
          imageUrl: $elem.find('img').attr('src'),
          productUrl: $elem.find('a').attr('href'),
          source: 'solelinks_html',
        });
      });
    }
    
    console.log(`✅ SoleLinks: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ SoleLinks scraper error:', error.message);
  }
  
  return releases;
}

/**
 * 2. SOLE RETRIEVER SCRAPER
 * Large release calendar + raffle list
 * URL: https://www.soleretriever.com/
 */
export async function scrapeSoleRetriever() {
  const releases = [];
  
  try {
    // Check for API endpoint (inspect network tab)
    const apiUrl = 'https://api.soleretriever.com/v1/releases?upcoming=true&limit=100';
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Origin': 'https://www.soleretriever.com',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      for (const item of data.releases || data.results || []) {
        releases.push({
          retailerId: 'sole_retriever_aggregator',
          retailerName: 'Sole Retriever',
          productName: item.name || item.title,
          brand: item.brand || extractBrand(item.name),
          sku: item.sku || item.styleCode,
          price: item.retailPrice || parsePrice(item.price),
          releaseDate: item.releaseDate || item.dropDate,
          status: item.raffleOpen ? 'raffle' : mapStatus(item.status),
          imageUrl: item.image?.url || item.thumbnail,
          productUrl: item.url,
          raffleInfo: item.raffles || [],
          resalePrice: item.resalePrice,
          source: 'sole_retriever_api',
        });
      }
    } else {
      // Fallback HTML scraping
      const htmlUrl = 'https://www.soleretriever.com/upcoming-releases';
      const htmlResponse = await fetch(htmlUrl);
      const html = await htmlResponse.text();
      const $ = cheerio.load(html);
      
      $('.sneaker-card, .release-card').each((i, elem) => {
        const $elem = $(elem);
        
        releases.push({
          retailerId: 'sole_retriever_aggregator',
          retailerName: 'Sole Retriever',
          productName: $elem.find('.sneaker-name, h3').text().trim(),
          brand: extractBrand($elem.find('.brand, .sneaker-name').text()),
          sku: $elem.find('.sku, .style-code').text().trim(),
          price: parsePrice($elem.find('.price').text()),
          releaseDate: $elem.find('.release-date').text().trim(),
          imageUrl: $elem.find('img').attr('src'),
          productUrl: 'https://www.soleretriever.com' + $elem.find('a').attr('href'),
          source: 'sole_retriever_html',
        });
      });
    }
    
    console.log(`✅ Sole Retriever: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ Sole Retriever scraper error:', error.message);
  }
  
  return releases;
}

/**
 * 3. SNEAKTORIOUS SCRAPER
 * Release + raffle calendar
 * URL: https://sneaktorious.com/
 */
export async function scrapeSneaktorious() {
  const releases = [];
  
  try {
    const url = 'https://sneaktorious.com/releases';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.release-item, .product-item').each((i, elem) => {
      const $elem = $(elem);
      
      releases.push({
        retailerId: 'sneaktorious_aggregator',
        retailerName: 'Sneaktorious',
        productName: $elem.find('.product-title, h3').text().trim(),
        brand: extractBrand($elem.find('.product-title').text()),
        sku: $elem.find('.sku').text().trim(),
        price: parsePrice($elem.find('.price').text()),
        releaseDate: $elem.find('.date').text().trim(),
        status: $elem.find('.raffle-badge').length > 0 ? 'raffle' : 'upcoming',
        imageUrl: $elem.find('img').attr('src'),
        productUrl: $elem.find('a').attr('href'),
        source: 'sneaktorious',
      });
    });
    
    console.log(`✅ Sneaktorious: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ Sneaktorious scraper error:', error.message);
  }
  
  return releases;
}

/**
 * 4. SNEAKER NEWS SCRAPER
 * Authoritative release info + metadata
 * URL: https://sneakernews.com/release-dates/
 */
export async function scrapeSneakerNews() {
  const releases = [];
  
  try {
    const url = 'https://sneakernews.com/release-dates/';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.release-date-item, article.release').each((i, elem) => {
      const $elem = $(elem);
      
      const title = $elem.find('.entry-title, h2, h3').text().trim();
      const priceText = $elem.find('.price, .retail-price').text().trim();
      const dateText = $elem.find('.release-date, time').text().trim();
      
      releases.push({
        retailerId: 'sneaker_news_aggregator',
        retailerName: 'Sneaker News',
        productName: title,
        brand: extractBrand(title),
        sku: extractSKU(title) || $elem.find('.sku').text().trim(),
        price: parsePrice(priceText),
        releaseDate: dateText,
        status: 'upcoming',
        imageUrl: $elem.find('img').attr('src') || $elem.find('img').attr('data-src'),
        productUrl: $elem.find('a.entry-title-link, a').first().attr('href'),
        description: $elem.find('.excerpt, .entry-summary').text().trim(),
        source: 'sneaker_news',
      });
    });
    
    console.log(`✅ Sneaker News: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ Sneaker News scraper error:', error.message);
  }
  
  return releases;
}

/**
 * 5. NICE KICKS SCRAPER
 * Release guides + retailer links
 * URL: https://www.nicekicks.com/
 */
export async function scrapeNiceKicks() {
  const releases = [];
  
  try {
    const url = 'https://www.nicekicks.com/release-dates/';
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.release-item, article').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2, h3, .title').text().trim();
      
      if (title) {
        releases.push({
          retailerId: 'nice_kicks_aggregator',
          retailerName: 'Nice Kicks',
          productName: title,
          brand: extractBrand(title),
          sku: extractSKU(title),
          price: parsePrice($elem.find('.price').text()),
          releaseDate: $elem.find('.date, time').text().trim(),
          imageUrl: $elem.find('img').attr('src'),
          productUrl: $elem.find('a').attr('href'),
          source: 'nice_kicks',
        });
      }
    });
    
    console.log(`✅ Nice Kicks: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ Nice Kicks scraper error:', error.message);
  }
  
  return releases;
}

/**
 * 6. HYPEBEAST SCRAPER
 * High-profile collab announcements
 * URL: https://hypebeast.com/footwear
 */
export async function scrapeHypebeast() {
  const releases = [];
  
  try {
    const url = 'https://hypebeast.com/footwear';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.post-box, article').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h2, .post-title').text().trim();
      
      // Filter for release-related articles
      if (title.match(/release|drop|launch|available|coming soon/i)) {
        releases.push({
          retailerId: 'hypebeast_aggregator',
          retailerName: 'Hypebeast',
          productName: title,
          brand: extractBrand(title),
          sku: extractSKU(title),
          imageUrl: $elem.find('img').attr('src'),
          productUrl: $elem.find('a').attr('href'),
          description: $elem.find('.excerpt, .description').text().trim(),
          source: 'hypebeast',
        });
      }
    });
    
    console.log(`✅ Hypebeast: Scraped ${releases.length} releases`);
  } catch (error) {
    console.error('❌ Hypebeast scraper error:', error.message);
  }
  
  return releases;
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
    'salomon': 'Salomon',
    'hoka': 'Hoka',
    'on running': 'On',
    'saucony': 'Saucony',
  };
  
  const lowerTitle = title.toLowerCase();
  
  for (const [key, value] of Object.entries(brands)) {
    if (lowerTitle.includes(key)) {
      return value;
    }
  }
  
  return 'Unknown';
}

function extractSKU(title) {
  // Common SKU patterns: DZ1234-123, FB1234, etc.
  const skuMatch = title.match(/\b([A-Z]{2,3}\d{4}[-\s]?\d{3})\b/);
  return skuMatch ? skuMatch[1] : null;
}

function parsePrice(priceText) {
  if (!priceText) return null;
  
  const match = priceText.match(/[\$€£]?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

function mapStatus(statusText) {
  if (!statusText) return 'upcoming';
  
  const lower = statusText.toLowerCase();
  
  if (lower.includes('sold out')) return 'sold_out';
  if (lower.includes('available') || lower.includes('live')) return 'available';
  if (lower.includes('raffle')) return 'raffle';
  if (lower.includes('coming soon') || lower.includes('upcoming')) return 'upcoming';
  
  return 'upcoming';
}

/**
 * MASTER AGGREGATOR RUNNER
 * Runs all release aggregator scrapers
 */
export async function runAllAggregatorScrapers() {
  console.log('🚀 Starting release aggregator scrapers...');
  
  const results = {
    total: 0,
    bySource: {},
    errors: [],
  };
  
  const scrapers = [
    { name: 'SoleLinks', fn: scrapeSoleLinks },
    { name: 'Sole Retriever', fn: scrapeSoleRetriever },
    { name: 'Sneaktorious', fn: scrapeSneaktorious },
    { name: 'Sneaker News', fn: scrapeSneakerNews },
    { name: 'Nice Kicks', fn: scrapeNiceKicks },
    { name: 'Hypebeast', fn: scrapeHypebeast },
  ];
  
  for (const { name, fn } of scrapers) {
    try {
      const releases = await fn();
      results.bySource[name] = releases.length;
      results.total += releases.length;
      
      // Process each release (deduplicate, clean, store)
      for (const release of releases) {
        // Here you would call your deduplication and storage logic
        // await processRelease(release);
      }
    } catch (error) {
      results.errors.push({ source: name, error: error.message });
      console.error(`❌ ${name} failed:`, error.message);
    }
  }
  
  console.log('✅ Aggregator scrapers complete:', results);
  return results;
}
