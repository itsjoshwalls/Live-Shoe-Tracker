// hibbetts.js
import { safeFetch } from "./core/utils.js";

export async function fetchList() {
  try {
    const res = await safeFetch("https://www.hibbett.com/api/products");
    return res.products || res.items || res.results || res.objects || [];
  } catch (err) {
    console.error("hibbetts fetch failed:", err.message);
    return [];
  }
}

export function normalize(p) {
  return {
    id: "hibbetts-" + (p.id || p.handle || Date.now()),
    retailerId: "hibbetts",
    retailerName: "Hibbett Sports",
    productName: p.title || p.name || p.publishedContent?.properties?.title,
    releaseDate: p.published_at || p.release_date || p.productInfo?.[0]?.launchView?.startEntryDate || null,
    price: p.variants?.[0]?.price || p.price || p.productInfo?.[0]?.merchPrice?.currentPrice || null,
    currency: "USD",
    status: p.available ? "live" : "upcoming",
    url: "https://www.hibbett.com/api/products/products/" + (p.handle || p.slug || p.id || ""),
    region: "US"
  };
}
