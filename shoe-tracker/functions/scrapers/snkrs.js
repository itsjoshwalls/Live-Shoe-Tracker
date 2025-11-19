// snkrs.js
import { safeFetch } from "./core/utils.js";

export async function fetchList() {
  try {
    const res = await safeFetch("https://api.nike.com/snkrs_content/v1");
    return res.products || res.items || res.results || res.objects || [];
  } catch (err) {
    console.error("snkrs fetch failed:", err.message);
    return [];
  }
}

export function normalize(p) {
  return {
    id: "snkrs-" + (p.id || p.handle || Date.now()),
    retailerId: "snkrs",
    retailerName: "Nike SNKRS",
    productName: p.title || p.name || p.publishedContent?.properties?.title,
    releaseDate: p.published_at || p.release_date || p.productInfo?.[0]?.launchView?.startEntryDate || null,
    price: p.variants?.[0]?.price || p.price || p.productInfo?.[0]?.merchPrice?.currentPrice || null,
    currency: "USD",
    status: p.available ? "live" : "upcoming",
    url: "https://api.nike.com/snkrs_content/v1/products/" + (p.handle || p.slug || p.id || ""),
    region: "US"
  };
}
