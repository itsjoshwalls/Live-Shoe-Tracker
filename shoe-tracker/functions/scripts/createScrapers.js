// scripts/createScrapers.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, "..", "scrapers");

const scraperTemplate = (name, displayName, url) => `// ${name}.js
import { safeFetch } from "./core/utils.js";

export async function fetchList() {
  try {
    const res = await safeFetch("${url}");
    return res.products || res.items || res.results || res.objects || [];
  } catch (err) {
    console.error("${name} fetch failed:", err.message);
    return [];
  }
}

export function normalize(p) {
  return {
    id: "${name}-" + (p.id || p.handle || Date.now()),
    retailerId: "${name}",
    retailerName: "${displayName}",
    productName: p.title || p.name || p.publishedContent?.properties?.title,
    releaseDate: p.published_at || p.release_date || p.productInfo?.[0]?.launchView?.startEntryDate || null,
    price: p.variants?.[0]?.price || p.price || p.productInfo?.[0]?.merchPrice?.currentPrice || null,
    currency: "USD",
    status: p.available ? "live" : "upcoming",
    url: "${url.replace(/\\.json.*|\\api.*/, '')}/products/" + (p.handle || p.slug || p.id || ""),
    region: "US"
  };
}
`;

const urls = {
  nike: "https://api.nike.com/product_feed/rollup_threads/v2",
  adidas: "https://www.adidas.com/api/products",
  footlocker: "https://www.footlocker.com/api/products",
  champs: "https://www.champssports.com/api/products",
  jdSports: "https://api.jdsports.com/products",
  snkrs: "https://api.nike.com/snkrs_content/v1",
  finishline: "https://api.finishline.com/store",
  hibbetts: "https://www.hibbett.com/api/products",
  undefeated: "https://undefeated.com/collections/footwear.json",
  concepts: "https://cncpts.com/collections/footwear.json",
  kith: "https://kith.com/collections/footwear.json",
  bodega: "https://bdgastore.com/collections/footwear.json",
  endclothing: "https://www.endclothing.com/media/catalog.json",
  offspring: "https://www.offspring.co.uk/api/products",
  sneakersnstuff: "https://www.sneakersnstuff.com/en/537/sneakers",
  lapstonehammer: "https://lapstoneandhammer.com/collections/footwear.json",
  extraButter: "https://extrabutterny.com/collections/footwear.json",
  atmos: "https://www.atmosusa.com/collections/footwear.json",
  socialStatus: "https://www.socialstatuspgh.com/collections/footwear.json",
  aMaManiere: "https://www.a-ma-maniere.com/collections/footwear.json",
  sizeOfficial: "https://www.size.co.uk/api/products",
  oneBlockDown: "https://www.oneblockdown.it/collections/footwear.json",
  solebox: "https://www.solebox.com/api/products",
  asphaltgold: "https://www.asphaltgold.com/collections/footwear.json",
  hanon: "https://www.hanon-shop.com/collections/footwear.json",
  feature: "https://feature.com/collections/footwear.json",
  kickz: "https://www.kickz.com/api/products",
  bait: "https://www.baitme.com/collections/footwear.json",
  oneness: "https://www.onenessboutique.com/collections/footwear.json",
  palace: "https://shop.palaceskateboards.com/collections/footwear.json",
  stockx: "https://stockx.com/api/browse"
};

const displayNames = {
  nike: "Nike",
  adidas: "Adidas",
  footlocker: "Foot Locker",
  champs: "Champs Sports",
  jdSports: "JD Sports",
  snkrs: "Nike SNKRS",
  finishline: "Finish Line",
  hibbetts: "Hibbett Sports",
  undefeated: "Undefeated",
  concepts: "Concepts",
  kith: "Kith",
  bodega: "Bodega",
  endclothing: "END.",
  offspring: "Offspring",
  sneakersnstuff: "Sneakersnstuff",
  lapstonehammer: "Lapstone & Hammer",
  extraButter: "Extra Butter",
  atmos: "atmos",
  socialStatus: "Social Status",
  aMaManiere: "A Ma Maniére",
  sizeOfficial: "size?",
  oneBlockDown: "One Block Down",
  solebox: "Solebox",
  asphaltgold: "Asphaltgold",
  hanon: "Hanon",
  feature: "Feature",
  kickz: "Kickz",
  bait: "BAIT",
  oneness: "Oneness",
  palace: "Palace",
  stockx: "StockX"
};

const scrapers = Object.keys(urls);

scrapers.forEach(scraper => {
  const display = displayNames[scraper];
  const url = urls[scraper];
  const content = scraperTemplate(scraper, display, url);
  fs.writeFileSync(path.join(baseDir, `${scraper}.js`), content);
});

console.log(`✅ Created ${scrapers.length} scraper files in functions/scrapers/`);
