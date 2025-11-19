// Social Media & Community Scrapers
// Sources: Twitter/X, Reddit, Discord (webhook-based)
// Path: functions/src/scrapers/socialSignals.js

import fetch from 'node-fetch';

/**
 * 1. TWITTER/X SCRAPER
 * Monitors @solelinks, @snkrnews, and other sneaker accounts
 * 
 * NOTE: Twitter API v2 requires authentication.
 * Get your bearer token at: https://developer.twitter.com/
 */
export async function scrapeTwitterSneakerAccounts() {
  const tweets = [];
  
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!bearerToken) {
      console.warn('⚠️ TWITTER_BEARER_TOKEN not set - skipping Twitter scraper');
      return tweets;
    }
    
    // List of key sneaker accounts
    const accounts = [
      'solelinks',
      'snkr_twitr',
      'SneakerNews',
      'NiceKicks',
      'SOLERETRIEVER',
      'py_rates',
      'J23app',
    ];
    
    for (const username of accounts) {
      // Get user ID first
      const userUrl = `https://api.twitter.com/2/users/by/username/${username}`;
      const userResponse = await fetch(userUrl, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      });
      
      if (!userResponse.ok) continue;
      
      const userData = await userResponse.json();
      const userId = userData.data?.id;
      
      if (!userId) continue;
      
      // Get recent tweets
      const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics,entities&expansions=attachments.media_keys&media.fields=url,preview_image_url`;
      
      const tweetsResponse = await fetch(tweetsUrl, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
        },
      });
      
      if (!tweetsResponse.ok) continue;
      
      const tweetsData = await tweetsResponse.json();
      
      for (const tweet of tweetsData.data || []) {
        // Filter for release-related tweets
        const releaseKeywords = ['drop', 'release', 'raffle', 'restock', 'available now', 'live'];
        const hasReleaseKeyword = releaseKeywords.some(keyword => 
          tweet.text.toLowerCase().includes(keyword)
        );
        
        if (hasReleaseKeyword) {
          tweets.push({
            source: 'twitter',
            account: username,
            tweetId: tweet.id,
            text: tweet.text,
            createdAt: tweet.created_at,
            likes: tweet.public_metrics?.like_count,
            retweets: tweet.public_metrics?.retweet_count,
            replies: tweet.public_metrics?.reply_count,
            urls: tweet.entities?.urls?.map(u => u.expanded_url) || [],
            mediaUrls: tweet.attachments?.media_keys || [],
            
            // Extract product info from tweet
            brand: extractBrand(tweet.text),
            sku: extractSKU(tweet.text),
            potentialRetailers: extractRetailerLinks(tweet.entities?.urls || []),
          });
        }
      }
    }
    
    console.log(`✅ Twitter: Scraped ${tweets.length} release-related tweets`);
  } catch (error) {
    console.error('❌ Twitter scraper error:', error.message);
  }
  
  return tweets;
}

/**
 * 2. REDDIT SCRAPER
 * Monitors r/Sneakers, r/SNKRS, r/SneakerDeals
 * 
 * Uses Reddit's JSON API (no auth required for public posts)
 */
export async function scrapeRedditSneakers() {
  const posts = [];
  
  try {
    const subreddits = [
      'Sneakers',
      'SNKRS',
      'SneakerDeals',
      'Repsneakers',
      'SneakerFits',
    ];
    
    for (const subreddit of subreddits) {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SneakerTrackerBot/1.0)',
        },
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      for (const post of data.data?.children || []) {
        const postData = post.data;
        
        // Filter for release/drop/restock posts
        const releaseKeywords = ['release', 'drop', 'restock', 'available', 'live', 'raffle', 'W', 'L'];
        const title = postData.title.toLowerCase();
        
        const hasReleaseKeyword = releaseKeywords.some(keyword => title.includes(keyword));
        
        if (hasReleaseKeyword) {
          posts.push({
            source: 'reddit',
            subreddit: subreddit,
            postId: postData.id,
            title: postData.title,
            text: postData.selftext,
            author: postData.author,
            createdAt: new Date(postData.created_utc * 1000).toISOString(),
            upvotes: postData.ups,
            comments: postData.num_comments,
            url: `https://www.reddit.com${postData.permalink}`,
            imageUrl: postData.url,
            
            // Extract product info
            brand: extractBrand(postData.title),
            sku: extractSKU(postData.title),
            sentiment: postData.title.includes('W') ? 'positive' : postData.title.includes('L') ? 'negative' : 'neutral',
          });
        }
      }
    }
    
    console.log(`✅ Reddit: Scraped ${posts.length} release-related posts`);
  } catch (error) {
    console.error('❌ Reddit scraper error:', error.message);
  }
  
  return posts;
}

/**
 * 3. DISCORD WEBHOOK LISTENER
 * Receives real-time drops from Discord communities
 * 
 * Setup: Create webhook endpoints in your Firebase Functions
 * and share the URLs with trusted Discord communities
 */
export async function processDiscordWebhook(webhookData) {
  try {
    const { content, embeds, author, timestamp } = webhookData;
    
    // Extract release info from Discord message
    const releaseInfo = {
      source: 'discord',
      channelName: author?.name,
      message: content,
      timestamp: timestamp,
      embeds: embeds?.map(embed => ({
        title: embed.title,
        description: embed.description,
        url: embed.url,
        imageUrl: embed.image?.url,
        fields: embed.fields,
      })),
      
      // Extract structured data
      brand: extractBrand(content || ''),
      sku: extractSKU(content || ''),
      retailerLinks: extractRetailerLinks(content || embeds?.[0]?.description || ''),
    };
    
    console.log('✅ Discord webhook processed:', releaseInfo);
    return releaseInfo;
  } catch (error) {
    console.error('❌ Discord webhook error:', error.message);
    return null;
  }
}

/**
 * 4. STOCKX TWITTER FEED MONITOR
 * Monitors @StockX for popular product announcements
 */
export async function scrapeStockXTwitter() {
  const tweets = [];
  
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) return tweets;
    
    // Search for StockX tweets about trending products
    const searchUrl = 'https://api.twitter.com/2/tweets/search/recent?query=from:StockX trending OR popular&max_results=10&tweet.fields=created_at,public_metrics';
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      for (const tweet of data.data || []) {
        tweets.push({
          source: 'stockx_twitter',
          tweetId: tweet.id,
          text: tweet.text,
          createdAt: tweet.created_at,
          engagement: tweet.public_metrics?.like_count + tweet.public_metrics?.retweet_count,
          brand: extractBrand(tweet.text),
          sku: extractSKU(tweet.text),
        });
      }
    }
    
    console.log(`✅ StockX Twitter: Scraped ${tweets.length} trending announcements`);
  } catch (error) {
    console.error('❌ StockX Twitter scraper error:', error.message);
  }
  
  return tweets;
}

/**
 * UTILITY FUNCTIONS
 */

function extractBrand(text) {
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
  
  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(brands)) {
    if (lowerText.includes(key)) return value;
  }
  return null;
}

function extractSKU(text) {
  const skuMatch = text.match(/\b([A-Z]{2,3}\d{4}[-\s]?\d{3})\b/);
  return skuMatch ? skuMatch[1] : null;
}

function extractRetailerLinks(textOrUrls) {
  const retailers = [];
  const text = Array.isArray(textOrUrls) 
    ? textOrUrls.map(u => u.expanded_url || u).join(' ')
    : textOrUrls;
  
  const retailerPatterns = {
    'nike.com': 'Nike',
    'footlocker.com': 'Footlocker',
    'adidas.com': 'Adidas',
    'endclothing.com': 'END Clothing',
    'kith.com': 'Kith',
    'undefeated.com': 'Undefeated',
    'sneakersnstuff.com': 'SNS',
    'stockx.com': 'StockX',
    'goat.com': 'GOAT',
  };
  
  for (const [domain, name] of Object.entries(retailerPatterns)) {
    if (text.includes(domain)) {
      retailers.push(name);
    }
  }
  
  return retailers;
}

/**
 * SENTIMENT ANALYSIS
 * Analyzes social signals to gauge hype/demand
 */
export function analyzeSentiment(posts) {
  const analysis = {
    totalPosts: posts.length,
    totalEngagement: 0,
    positiveSignals: 0,
    negativeSignals: 0,
    neutralSignals: 0,
    topBrands: {},
    topSKUs: {},
  };
  
  for (const post of posts) {
    // Calculate engagement
    const engagement = (post.likes || 0) + (post.retweets || 0) + (post.upvotes || 0);
    analysis.totalEngagement += engagement;
    
    // Sentiment
    if (post.sentiment === 'positive' || post.text?.includes('🔥') || post.text?.includes('W')) {
      analysis.positiveSignals++;
    } else if (post.sentiment === 'negative' || post.text?.includes('L')) {
      analysis.negativeSignals++;
    } else {
      analysis.neutralSignals++;
    }
    
    // Brand tracking
    if (post.brand) {
      analysis.topBrands[post.brand] = (analysis.topBrands[post.brand] || 0) + 1;
    }
    
    // SKU tracking
    if (post.sku) {
      analysis.topSKUs[post.sku] = (analysis.topSKUs[post.sku] || 0) + 1;
    }
  }
  
  analysis.sentimentScore = (analysis.positiveSignals - analysis.negativeSignals) / analysis.totalPosts;
  analysis.averageEngagement = analysis.totalEngagement / analysis.totalPosts;
  
  return analysis;
}

/**
 * MASTER SOCIAL SCRAPER RUNNER
 */
export async function runAllSocialScrapers() {
  console.log('🚀 Starting social signal scrapers...');
  
  const results = {
    total: 0,
    bySource: {},
    sentiment: null,
    errors: [],
  };
  
  try {
    // Twitter
    const tweets = await scrapeTwitterSneakerAccounts();
    results.bySource['Twitter'] = tweets.length;
    results.total += tweets.length;
    
    // Reddit
    const redditPosts = await scrapeRedditSneakers();
    results.bySource['Reddit'] = redditPosts.length;
    results.total += redditPosts.length;
    
    // StockX Twitter
    const stockxTweets = await scrapeStockXTwitter();
    results.bySource['StockX Twitter'] = stockxTweets.length;
    results.total += stockxTweets.length;
    
    // Analyze sentiment
    const allPosts = [...tweets, ...redditPosts, ...stockxTweets];
    results.sentiment = analyzeSentiment(allPosts);
    
    console.log('✅ Social scrapers complete:', results);
  } catch (error) {
    results.errors.push({ source: 'Social', error: error.message });
    console.error('❌ Social scraper error:', error.message);
  }
  
  return results;
}
