import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { batchUpsertToFirestore } from './firestoreHandler.js';

const BRAND_MAP = [
  { rx: /\b(nike|snkrs|jordan)\b/i, brand: 'Nike' },
  { rx: /\b(adidas|yeezy)\b/i, brand: 'adidas' },
  { rx: /\b(new balance|nb)\b/i, brand: 'New Balance' },
  { rx: /\b(asics)\b/i, brand: 'ASICS' },
  { rx: /\b(puma)\b/i, brand: 'PUMA' },
  { rx: /\b(salomon)\b/i, brand: 'Salomon' },
  { rx: /\b(converse)\b/i, brand: 'Converse' }
];

const toISO4217 = (cur) => {
  if (!cur) return 'USD';
  const s = String(cur).trim().toUpperCase();
  if (s === '$' || s === 'US$') return 'USD';
  if (s === '£' || s === 'GBP£') return 'GBP';
  if (s === '€') return 'EUR';
  if (/^[A-Z]{3}$/.test(s)) return s;
  return 'USD';
};

const inferBrand = (r) => {
  if (r.brand) return r.brand;
  const text = `${r.name || ''} ${r.raw?.vendor || ''}`;
  for (const { rx, brand } of BRAND_MAP) {
    if (rx.test(text)) return brand;
  }
  return undefined;
};

// Map scraper output to API server Release schema (db.ts ReleaseSchema)
const mapToApiRelease = (r) => ({
  name: r.name,
  sku: r.sku || undefined,
  date: r.releaseDate || undefined,
  status: r.status || 'upcoming',
  price: typeof r.price === 'number' ? r.price : undefined,
  currency: toISO4217(r.currency || r.raw?.variants?.[0]?.currency || 'USD'),
  images: r.imageUrl ? [r.imageUrl] : undefined,
  brand: inferBrand(r),
  metadata: {
    retailer: r.retailer,
    url: r.url,
    locations: r.locations || [],
    sizes: r.sizes || [],
    raw: r.raw || undefined
  }
});

export const handleReleases = async (storeKey, releases) => {
  console.log(`[${storeKey}] ${releases.length} releases`);

  const apiPayload = releases.map(mapToApiRelease);

  // 1. Try sending to API server (if configured)
  const apiBase = process.env.API_BASE_URL || process.env.SNEAKER_API_BASE_URL;
  if (apiBase && releases.length) {
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/releases/enhanced/batch`;
      const response = await axios.post(url, apiPayload, { timeout: 20000 });
      console.log(`[${storeKey}] ✅ Sent ${apiPayload.length} releases to API (status: ${response.status})`);
    } catch (err) {
      console.error(`[${storeKey}] ⚠️  API batch failed:`, err?.response?.data || err?.message || err);
    }
  }

  // 2. Write to Firestore (if FIREBASE_SERVICE_ACCOUNT is set)
  if (process.env.FIREBASE_SERVICE_ACCOUNT && releases.length) {
    try {
      const collectionName = process.env.FIRESTORE_COLLECTION || 'releases';
      const result = await batchUpsertToFirestore(apiPayload, collectionName);
      console.log(`[${storeKey}] 🔥 Firestore: ✅ ${result.inserted}, ❌ ${result.errors}`);
    } catch (err) {
      console.error(`[${storeKey}] ⚠️  Firestore write failed:`, err?.message || err);
    }
  }

  // 3. Always write NDJSON fallback for Supabase import
  try {
    const outDir = path.resolve(process.cwd(), 'output');
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${storeKey}-${Date.now()}.ndjson`);
    const stream = fs.createWriteStream(file, { flags: 'a' });
    for (const r of apiPayload) {
      stream.write(JSON.stringify(r) + '\n');
    }
    stream.end();
    console.log(`[${storeKey}] 💾 NDJSON: ${releases.length} releases → ${path.basename(file)}`);
  } catch (e) {
    console.error(`[${storeKey}] ❌ Failed to write NDJSON:`, e?.message || e);
  }

  return releases;
};