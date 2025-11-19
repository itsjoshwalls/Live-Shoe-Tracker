import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SNKRS_API = "https://api.nike.com/product_feed/threads/v2/?filter=marketplace(US)&filter=language(en)&filter=channelId(d9a5bc42-4b9c-4976-858a-f159cf99c647)";

async function scrapeSnkrs() {
  try {
    console.log("Scraping Nike SNKRS...");
    const res = await fetch(SNKRS_API, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      },
      timeout: 15000
    });

    if (!res.ok) {
      console.log(`SNKRS API returned ${res.status}`);
      return [];
    }

    const data = await res.json();
    const products = data.objects || [];

    const releases = products
      .filter(p => p.publishedContent?.properties?.seo?.slug)
      .map(p => {
        const props = p.publishedContent.properties;
        return {
          name: props.seo.title || props.title,
          sku: p.productInfo?.[0]?.merchantProductId || null,
          release_date: p.effectiveStartDate || p.startDate,
          retailer: "Nike SNKRS",
          price: parseFloat(p.productInfo?.[0]?.merchPrice?.currentPrice || 0),
          product_url: `https://www.nike.com/launch/t/${props.seo.slug}`,
          image_url: props.coverCard?.properties?.squarishURL || null,
          status: p.productInfo?.[0]?.availability?.available ? "available" : "upcoming"
        };
      });

    console.log(`Found ${releases.length} SNKRS releases`);
    return releases;
  } catch (error) {
    console.error(`SNKRS scrape error: ${error.message}`);
    return [];
  }
}

async function upsertReleases(releases) {
  if (releases.length === 0) return;

  try {
    const { error } = await supabase
      .from("shoe_releases")
      .upsert(releases, { onConflict: "retailer,sku" });

    if (error) throw error;
    console.log(`Upserted ${releases.length} SNKRS releases`);
  } catch (error) {
    console.error(`Upsert error: ${error.message}`);
  }
}

async function main() {
  console.log("SNKRS scraper started");
  const interval = parseInt(process.env.SCRAPE_INTERVAL || "180") * 1000;

  while (true) {
    const releases = await scrapeSnkrs();
    await upsertReleases(releases);
    console.log(`Sleeping ${interval / 1000}s...`);
    await new Promise(r => setTimeout(r, interval));
  }
}

main().catch(console.error);
