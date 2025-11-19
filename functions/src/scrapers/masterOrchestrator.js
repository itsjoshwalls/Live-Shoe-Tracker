// Master Scraper Orchestrator
// Combines all scraping sources into one coordinated system
// Path: functions/src/scrapers/masterOrchestrator.js

import { runAllScrapers as runRetailerScrapers } from './productionScrapers.js';
import { runAllAggregatorScrapers } from './releaseAggregators.js';
import { runAllResaleScrapers } from './resaleMarketplaces.js';
import { runAllSocialScrapers } from './socialSignals.js';

/**
 * MASTER ORCHESTRATOR
 * Runs all scraper categories with prioritization and throttling
 */
export async function runMasterScraper(options = {}) {
  const {
    includeRetailers = true,
    includeAggregators = true,
    includeResale = true,
    includeSocial = true,
    priorityMode = false, // If true, only run high-priority sources
  } = options;
  
  console.log('🚀 MASTER SCRAPER STARTED');
  console.log('Options:', { includeRetailers, includeAggregators, includeResale, includeSocial, priorityMode });
  
  const startTime = Date.now();
  const results = {
    timestamp: new Date().toISOString(),
    totalReleases: 0,
    totalProducts: 0,
    totalSocialSignals: 0,
    byCategory: {},
    sentiment: null,
    errors: [],
    duration: 0,
  };
  
  try {
    // PHASE 1: Direct Retailers (highest priority - fresh data)
    if (includeRetailers) {
      console.log('\n📍 PHASE 1: Direct Retailer Scrapers...');
      const retailerResults = await runRetailerScrapers();
      results.byCategory['Direct Retailers'] = retailerResults;
      results.totalReleases += retailerResults.total || 0;
    }
    
    // PHASE 2: Release Aggregators (medium priority - good coverage)
    if (includeAggregators && !priorityMode) {
      console.log('\n📰 PHASE 2: Release Aggregator Scrapers...');
      const aggregatorResults = await runAllAggregatorScrapers();
      results.byCategory['Aggregators'] = aggregatorResults;
      results.totalReleases += aggregatorResults.total || 0;
    }
    
    // PHASE 3: Resale Markets (medium priority - demand signals)
    if (includeResale) {
      console.log('\n💰 PHASE 3: Resale Marketplace Scrapers...');
      const resaleResults = await runAllResaleScrapers();
      results.byCategory['Resale Markets'] = resaleResults;
      results.totalProducts += resaleResults.total || 0;
    }
    
    // PHASE 4: Social Signals (lower priority - hype tracking)
    if (includeSocial && !priorityMode) {
      console.log('\n📱 PHASE 4: Social Signal Scrapers...');
      const socialResults = await runAllSocialScrapers();
      results.byCategory['Social Signals'] = socialResults;
      results.totalSocialSignals += socialResults.total || 0;
      results.sentiment = socialResults.sentiment;
    }
    
    // Calculate totals and metrics
    results.duration = Date.now() - startTime;
    
    // Aggregate errors
    for (const category of Object.values(results.byCategory)) {
      if (category.errors) {
        results.errors.push(...category.errors);
      }
    }
    
    console.log('\n✅ MASTER SCRAPER COMPLETE');
    console.log(`Total Releases: ${results.totalReleases}`);
    console.log(`Total Products: ${results.totalProducts}`);
    console.log(`Social Signals: ${results.totalSocialSignals}`);
    console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Errors: ${results.errors.length}`);
    
    // Store results summary in Firestore
    await storeScraperMetrics(results);
    
    return results;
  } catch (error) {
    console.error('❌ MASTER SCRAPER FAILED:', error);
    results.errors.push({ source: 'Master Orchestrator', error: error.message });
    return results;
  }
}

/**
 * PRIORITY MODE RUNNER
 * Only scrapes critical sources for time-sensitive updates
 */
export async function runPriorityScrapers() {
  console.log('⚡ Running PRIORITY scrapers only...');
  
  return await runMasterScraper({
    includeRetailers: true,
    includeAggregators: false,
    includeResale: true,
    includeSocial: false,
    priorityMode: true,
  });
}

/**
 * SCHEDULED SCRAPER MODES
 * Different schedules for different data freshness requirements
 */

// High-frequency: Every 30 minutes (Nike, Adidas, aggregators)
export async function runHighFrequencyScraper() {
  return await runMasterScraper({
    includeRetailers: true,
    includeAggregators: true,
    includeResale: false,
    includeSocial: false,
  });
}

// Medium-frequency: Every 2 hours (resale markets)
export async function runMediumFrequencyScraper() {
  return await runMasterScraper({
    includeRetailers: false,
    includeAggregators: false,
    includeResale: true,
    includeSocial: false,
  });
}

// Low-frequency: Every 6 hours (social signals)
export async function runLowFrequencyScraper() {
  return await runMasterScraper({
    includeRetailers: false,
    includeAggregators: false,
    includeResale: false,
    includeSocial: true,
  });
}

/**
 * STORE SCRAPER METRICS
 * Tracks scraper performance over time
 */
async function storeScraperMetrics(results) {
  try {
    const admin = (await import('firebase-admin')).default;
    const db = admin.firestore();
    
    await db.collection('scraper_metrics').add({
      timestamp: results.timestamp,
      totalReleases: results.totalReleases,
      totalProducts: results.totalProducts,
      totalSocialSignals: results.totalSocialSignals,
      duration: results.duration,
      errorCount: results.errors.length,
      errors: results.errors.slice(0, 10), // Store first 10 errors only
      byCategory: Object.keys(results.byCategory).reduce((acc, key) => {
        acc[key] = {
          total: results.byCategory[key].total || 0,
          bySource: results.byCategory[key].bySource || {},
        };
        return acc;
      }, {}),
    });
    
    console.log('✅ Scraper metrics stored in Firestore');
  } catch (error) {
    console.error('❌ Failed to store scraper metrics:', error.message);
  }
}

/**
 * GITHUB SCRAPER PROJECT DISCOVERY
 * Finds and vets open-source sneaker scraper projects
 */
export async function discoverGitHubScrapers() {
  const projects = [];
  
  try {
    const searchTerms = [
      'sneaker scraper',
      'SNKRS API',
      'sneaker release scraper',
      'footlocker scraper',
      'stockx scraper',
      'adidas confirmed scraper',
    ];
    
    for (const term of searchTerms) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(term)}&sort=stars&order=desc&per_page=10`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SneakerTracker',
          'Accept': 'application/vnd.github.v3+json',
          // Add token if rate limit is an issue: 'Authorization': `token ${process.env.GITHUB_TOKEN}`
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      for (const repo of data.items || []) {
        projects.push({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          lastUpdated: repo.updated_at,
          license: repo.license?.name,
          topics: repo.topics,
          isActive: isRepoActive(repo.updated_at),
          quality: calculateQualityScore(repo),
        });
      }
    }
    
    // Deduplicate by full_name
    const uniqueProjects = Array.from(
      new Map(projects.map(p => [p.fullName, p])).values()
    );
    
    // Sort by quality score
    uniqueProjects.sort((a, b) => b.quality - a.quality);
    
    console.log(`✅ Discovered ${uniqueProjects.length} GitHub scraper projects`);
    return uniqueProjects;
  } catch (error) {
    console.error('❌ GitHub discovery error:', error.message);
    return [];
  }
}

function isRepoActive(updatedAt) {
  const lastUpdate = new Date(updatedAt);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return lastUpdate > sixMonthsAgo;
}

function calculateQualityScore(repo) {
  let score = 0;
  
  // Stars (max 50 points)
  score += Math.min(repo.stargazers_count / 10, 50);
  
  // Forks (max 20 points)
  score += Math.min(repo.forks_count / 5, 20);
  
  // Activity (max 20 points)
  if (isRepoActive(repo.updated_at)) {
    score += 20;
  }
  
  // License (max 10 points)
  if (repo.license?.name && repo.license.name !== 'Other') {
    score += 10;
  }
  
  return score;
}

/**
 * TOP GITHUB PROJECTS (Curated List)
 * Manually vetted high-quality scraper projects
 */
export const RECOMMENDED_GITHUB_PROJECTS = [
  {
    name: 'sneaker-monitors',
    url: 'https://github.com/yasserqureshi1/sneaker-monitors',
    description: 'Multi-site sneaker monitors with Discord webhooks',
    stars: '500+',
    language: 'Python',
    license: 'MIT',
    lastChecked: '2024-10-15',
    notes: 'Supports Shopify, Supreme, Footsites, SNKRS. Well-maintained.',
  },
  {
    name: 'SoleAIO-Servers',
    url: 'https://github.com/pysrc/SoleAIO-Servers',
    description: 'Sneaker bot with monitors and auto-checkout',
    stars: '300+',
    language: 'Python',
    license: 'GPL-3.0',
    notes: 'Advanced bot framework. May violate retailer ToS.',
  },
  {
    name: 'nike-snkrs-bot',
    url: 'https://github.com/philipperemy/nike-snkrs-bot',
    description: 'SNKRS API wrapper and automation',
    stars: '200+',
    language: 'Python',
    notes: 'Good for understanding SNKRS API structure.',
  },
  {
    name: 'stockx-api',
    url: 'https://github.com/AidanJSmith/StockXAPI',
    description: 'Unofficial StockX API wrapper',
    stars: '150+',
    language: 'Python',
    license: 'MIT',
    notes: 'Clean API for StockX product/pricing data.',
  },
  {
    name: 'sneaker-release-scraper',
    url: 'https://github.com/search?q=sneaker+release+scraper',
    description: 'Various scraper implementations',
    notes: 'Search term - multiple projects available',
  },
];

/**
 * EXPORT CONFIGURATION
 */
export const SCRAPER_CONFIG = {
  // Scraper frequencies (in minutes)
  frequencies: {
    highPriority: 30,    // Nike, Adidas, major retailers
    medium: 120,         // Aggregators, boutiques
    low: 360,            // Social signals, resale
  },
  
  // Rate limiting (requests per minute)
  rateLimits: {
    nike: 60,
    adidas: 60,
    stockx: 30,
    aggregators: 20,
    social: 10,
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2, // 2s, 4s, 8s
  },
  
  // Timeout (milliseconds)
  timeout: 30000, // 30 seconds
  
  // Data retention
  retention: {
    scraperMetrics: 90, // days
    socialSignals: 7,   // days
  },
};
