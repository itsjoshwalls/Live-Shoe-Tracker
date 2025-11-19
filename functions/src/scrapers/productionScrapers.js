// Production Scraper Implementations

import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { db } from "../utils/firestore.js";
import { logInfo, logError } from "../utils/logger.js";

/**
 * Nike SNKRS Scraper (API-based)
 */
export async function scrapeNikeSNKRS() {
  try {
    const response = await fetch(
      "https://api.nike.com/launch/launch_views/v2?filter=upcoming&offset=0&count=50"
    );
    const data = await response.json();

    const releases = [];
    for (const item of data.objects || []) {
      const release = {
        id: `nike_${item.id}`,
        name: item.publishedContent?.products?.[0]?.productName || "Unknown",
        sku: item.publishedContent?.products?.[0]?.styleColor || "",
        brand: "Nike",
        model: item.publishedContent?.products?.[0]?.productType || "",
        colorway: item.publishedContent?.products?.[0]?.colorDescription || "",
        release_date: item.startEntryDate || item.effectiveStartSellDate,
        price: item.publishedContent?.products?.[0]?.commercePublishDate?.price || null,
        currency: "USD",
        status: item.method === "DRAW" ? "RAFFLE_OPEN" : "UPCOMING",
        retailer_id: "nike",
        retailer_name: "Nike SNKRS",
        image_url: item.imageUrl || item.publishedContent?.products?.[0]?.imageUrl,
        url: `https://www.nike.com/launch/t/${item.publishedContent?.products?.[0]?.slug}`,
        region: "US",
        release_type: item.method?.toLowerCase() || "online",
        sizes: item.availableSkus?.map((s) => s.nikeSize) || [],
      };

      releases.push(release);
    }

    logInfo(`Nike SNKRS: Scraped ${releases.length} releases`);
    return releases;
  } catch (err) {
    logError("Nike SNKRS scraper failed", err);
    return [];
  }
}

/**
 * Adidas Confirmed Scraper (API-based)
 */
export async function scrapeAdidasConfirmed() {
  try {
    const response = await fetch(
      "https://www.adidas.com/api/products/upcoming?sitePath=us"
    );
    const data = await response.json();

    const releases = [];
    for (const item of data.data || []) {
      const release = {
        id: `adidas_${item.productId}`,
        name: item.displayName || item.name,
        sku: item.modelNumber || "",
        brand: "Adidas",
        model: item.category || "",
        colorway: item.colorway || "",
        release_date: item.releaseDate,
        price: item.price?.currentPrice || null,
        currency: "USD",
        status: "UPCOMING",
        retailer_id: "adidas",
        retailer_name: "Adidas Confirmed",
        image_url: item.image?.src || "",
        url: `https://www.adidas.com${item.url}`,
        region: "US",
        release_type: "confirmed",
        sizes: [],
      };

      releases.push(release);
    }

    logInfo(`Adidas Confirmed: Scraped ${releases.length} releases`);
    return releases;
  } catch (err) {
    logError("Adidas Confirmed scraper failed", err);
    return [];
  }
}

/**
 * Footlocker Launch Calendar Scraper
 */
export async function scrapeFootlocker() {
  try {
    const response = await fetch(
      "https://www.footlocker.com/api/products/upcoming"
    );
    const data = await response.json();

    const releases = [];
    for (const item of data.items || []) {
      const release = {
        id: `footlocker_${item.sku}`,
        name: item.title || "",
        sku: item.sku || "",
        brand: item.brand || "",
        model: item.model || "",
        colorway: item.colorDescription || "",
        release_date: item.releaseDate,
        price: item.price?.value || null,
        currency: "USD",
        status: "UPCOMING",
        retailer_id: "footlocker",
        retailer_name: "Footlocker",
        image_url: item.images?.[0]?.url || "",
        url: `https://www.footlocker.com${item.url}`,
        region: "US",
        release_type: "fcfs",
        sizes: item.sizes || [],
      };

      releases.push(release);
    }

    logInfo(`Footlocker: Scraped ${releases.length} releases`);
    return releases;
  } catch (err) {
    logError("Footlocker scraper failed", err);
    return [];
  }
}

/**
 * END Clothing Scraper (API-based)
 */
export async function scrapeENDClothing() {
  try {
    const response = await fetch(
      "https://launches.endclothing.com/api/products"
    );
    const data = await response.json();

    const releases = [];
    for (const item of data.products || []) {
      const release = {
        id: `end_${item.id}`,
        name: item.name || "",
        sku: item.sku || "",
        brand: item.brand || "",
        model: item.model || "",
        colorway: item.color || "",
        release_date: item.publishDate,
        price: item.price?.amount || null,
        currency: item.price?.currency || "GBP",
        status: item.status === "live" ? "LIVE" : "UPCOMING",
        retailer_id: "end",
        retailer_name: "END Clothing",
        image_url: item.images?.[0] || "",
        url: item.url || "",
        region: "UK",
        release_type: "raffle",
        sizes: item.sizes || [],
      };

      releases.push(release);
    }

    logInfo(`END Clothing: Scraped ${releases.length} releases`);
    return releases;
  } catch (err) {
    logError("END Clothing scraper failed", err);
    return [];
  }
}

/**
 * StockX Market Data Scraper (for resale prices)
 */
export async function scrapeStockX(productId) {
  try {
    const response = await fetch(
      `https://stockx.com/api/browse?productId=${productId}`
    );
    const data = await response.json();

    const marketData = {
      retailer_id: "stockx",
      product_id: productId,
      lowest_ask: data.Product?.market?.lowestAsk || null,
      highest_bid: data.Product?.market?.highestBid || null,
      last_sale: data.Product?.market?.lastSale || null,
      sales_last_72h: data.Product?.market?.salesLast72Hours || 0,
      volatility: data.Product?.market?.volatility || null,
      timestamp: new Date().toISOString(),
    };

    logInfo(`StockX: Fetched market data for ${productId}`);
    return marketData;
  } catch (err) {
    logError("StockX scraper failed", err);
    return null;
  }
}

/**
 * Generic Shopify Boutique Scraper
 * Works for: Kith, Concepts, BAIT, Extra Butter, etc.
 */
export async function scrapeShopifyBoutique(retailerId, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/products.json?limit=250`);
    const data = await response.json();

    const releases = [];
    const sneakerKeywords = ["jordan", "yeezy", "dunk", "air max", "boost"];

    for (const product of data.products || []) {
      const productName = product.title.toLowerCase();
      const isSneaker = sneakerKeywords.some((keyword) =>
        productName.includes(keyword)
      );

      if (!isSneaker) continue;

      const release = {
        id: `${retailerId}_${product.id}`,
        name: product.title || "",
        sku: product.variants?.[0]?.sku || "",
        brand: product.vendor || "",
        model: product.product_type || "",
        colorway: "",
        release_date: product.published_at,
        price: product.variants?.[0]?.price || null,
        currency: "USD",
        status: product.variants?.[0]?.available ? "LIVE" : "SOLD_OUT",
        retailer_id: retailerId,
        retailer_name: product.vendor,
        image_url: product.images?.[0]?.src || "",
        url: `${baseUrl}/products/${product.handle}`,
        region: "US",
        release_type: "online",
        sizes: product.variants?.map((v) => v.option1) || [],
      };

      releases.push(release);
    }

    logInfo(`${retailerId}: Scraped ${releases.length} releases`);
    return releases;
  } catch (err) {
    logError(`${retailerId} scraper failed`, err);
    return [];
  }
}

/**
 * Data Cleaning & Standardization
 */
export function cleanReleaseData(rawRelease) {
  return {
    ...rawRelease,
    name: rawRelease.name?.trim() || "Unknown",
    sku: rawRelease.sku?.toUpperCase().trim() || "",
    brand: standardizeBrandName(rawRelease.brand),
    release_date: standardizeDate(rawRelease.release_date),
    price: parseFloat(rawRelease.price) || null,
    status: standardizeStatus(rawRelease.status),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function standardizeBrandName(brand) {
  const brandMap = {
    nike: "Nike",
    adidas: "Adidas",
    "new balance": "New Balance",
    asics: "ASICS",
    puma: "Puma",
    reebok: "Reebok",
    converse: "Converse",
    vans: "Vans",
  };

  return brandMap[brand?.toLowerCase()] || brand || "Unknown";
}

function standardizeDate(dateString) {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch {
    return null;
  }
}

function standardizeStatus(status) {
  const statusMap = {
    upcoming: "UPCOMING",
    live: "LIVE",
    "raffle open": "RAFFLE_OPEN",
    "raffle closed": "RAFFLE_CLOSED",
    "sold out": "SOLD_OUT",
    closed: "CLOSED",
    restocked: "RESTOCKED",
  };

  return statusMap[status?.toLowerCase()] || "UNKNOWN";
}

/**
 * Deduplication Logic
 */
export async function deduplicateRelease(release) {
  // Check if release already exists by SKU and retailer
  const existingSnap = await db
    .collection("releases")
    .where("sku", "==", release.sku)
    .where("retailer_id", "==", release.retailer_id)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    const existing = existingDoc.data();

    // Update if data has changed
    if (
      existing.status !== release.status ||
      existing.price !== release.price ||
      existing.release_date !== release.release_date
    ) {
      await existingDoc.ref.update({
        ...release,
        updated_at: new Date().toISOString(),
      });
      logInfo(`Updated existing release: ${release.id}`);
      return "updated";
    }

    return "duplicate";
  }

  // New release - add to Firestore
  await db.collection("releases").doc(release.id).set(release);
  logInfo(`Added new release: ${release.id}`);
  return "new";
}

/**
 * Master Scraper Orchestrator
 */
export async function runAllScrapers() {
  const results = {
    total: 0,
    new: 0,
    updated: 0,
    duplicates: 0,
    errors: 0,
  };

  const scraperFunctions = [
    { name: "Nike SNKRS", fn: scrapeNikeSNKRS },
    { name: "Adidas Confirmed", fn: scrapeAdidasConfirmed },
    { name: "Footlocker", fn: scrapeFootlocker },
    { name: "END Clothing", fn: scrapeENDClothing },
    { name: "Kith", fn: () => scrapeShopifyBoutique("kith", "https://kith.com") },
    {
      name: "Concepts",
      fn: () => scrapeShopifyBoutique("concepts", "https://cncpts.com"),
    },
    {
      name: "BAIT",
      fn: () => scrapeShopifyBoutique("bait", "https://www.baitme.com"),
    },
  ];

  for (const scraper of scraperFunctions) {
    try {
      logInfo(`Running scraper: ${scraper.name}`);
      const releases = await scraper.fn();

      for (const rawRelease of releases) {
        const cleanedRelease = cleanReleaseData(rawRelease);
        const status = await deduplicateRelease(cleanedRelease);

        results.total++;
        if (status === "new") results.new++;
        else if (status === "updated") results.updated++;
        else results.duplicates++;
      }
    } catch (err) {
      logError(`Scraper ${scraper.name} failed`, err);
      results.errors++;
    }
  }

  logInfo(`Scraping complete: ${JSON.stringify(results)}`);
  return results;
}
