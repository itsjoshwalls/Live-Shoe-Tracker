import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SHOPIFY_STORES = [
  "a-ma-maniere.com",
  "bdgastore.com",
  "undefeated.com",
  "baitme.com",
  "extrabutterny.com",
  "packershoes.com",
  "xhibition.co",
  "sneakersnstuff.com",
  "size.co.uk",
  "offspring.co.uk",
  "footpatrol.com",
  "hanon-shop.com",
  "wellgosh.com",
  // Add remaining 23 stores from shopify_stores.json
];

async function scrapeShopifyStore(domain) {
  try {
    console.log(`Scraping ${domain}...`);
    const url = `https://${domain}/products.json?limit=250`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    if (!res.ok) {
      console.log(`  ${domain}: HTTP ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data.products || [];

    const releases = products
      .filter((p) => {
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        return (
          tags.includes("upcoming") ||
          tags.includes("release") ||
          p.title.match(/jordan|dunk|yeezy|release/i)
        );
      })
      .map((p) => ({
        name: p.title,
        sku: p.variants?.[0]?.sku || null,
        release_date: p.published_at,
        retailer: domain,
        price: parseFloat(p.variants?.[0]?.price || 0),
        product_url: `https://${domain}/products/${p.handle}`,
        image_url: p.images?.[0]?.src || null,
        status: "upcoming",
      }));

    console.log(`  ${domain}: ${releases.length} releases`);
    return releases;
  } catch (error) {
    console.error(`  ${domain}: ${error.message}`);
    return [];
  }
}

async function upsertReleases(releases) {
  if (releases.length === 0) return;

  try {
    const { data, error } = await supabase
      .from("shoe_releases")
      .upsert(releases, { onConflict: "retailer,sku" });

    if (error) throw error;
    console.log(`Upserted ${releases.length} releases to Supabase`);
  } catch (error) {
    console.error(`Upsert error: ${error.message}`);
  }
}

async function main() {
  console.log("Shopify scraper started");
  const interval = parseInt(process.env.SCRAPE_INTERVAL || "300") * 1000;

  while (true) {
    const allReleases = [];

    for (const domain of SHOPIFY_STORES) {
      const releases = await scrapeShopifyStore(domain);
      allReleases.push(...releases);
      await new Promise((r) => setTimeout(r, 500)); // Rate limit
    }

    await upsertReleases(allReleases);
    console.log(`Scraped ${allReleases.length} total releases. Sleeping ${interval / 1000}s...`);
    await new Promise((r) => setTimeout(r, interval));
  }
}

main().catch(console.error);
