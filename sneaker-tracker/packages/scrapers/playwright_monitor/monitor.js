/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import admin from 'firebase-admin';
import process from 'node:process';

const PROJECT_ROOT = path.resolve(new URL(import.meta.url).pathname, '../../..');

function initFirebase() {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error('FIREBASE_SERVICE_ACCOUNT is required but not set.');
    console.error('Tip (PowerShell):');
      console.error("$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\\path\\to\\service-account.json' -Raw");
    process.exit(1);
  }
  let sa;
  try {
    sa = JSON.parse(saJson);
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT is set but not valid JSON:', e.message || e);
    process.exit(1);
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch (e) {
    // already initialized
  }
  return admin.firestore();
}

async function extractStructuredData(page) {
  try {
    const scripts = await page.$$eval('script[type="application/ld+json"]', nodes => nodes.map(n => n.textContent));
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s);
        if (parsed && (parsed['@type'] || parsed['offers'])) return parsed;
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function processTarget(pg, db, target) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Add user-agent to reduce bot detection
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    await page.goto(target.url, { timeout: 60000, waitUntil: 'domcontentloaded' });
    
    // Use domcontentloaded first, then wait for key content with shorter timeout
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } catch {
      // Continue even if networkidle times out - page may have loaded enough content
      console.log(`  (networkidle timeout for ${target.id}, continuing...)`);
    }
    
    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isRaffle = /raffle|entry|draw|raffle entry/i.test(bodyText);
    const hasRelease = /release|coming soon|launch/i.test(bodyText);
    const structured = await extractStructuredData(page);

    // Collect images (structured data + DOM img tags)
    let images = [];
    try {
      if (structured && structured.image) {
        if (Array.isArray(structured.image)) {
          images.push(...structured.image.filter(Boolean));
        } else if (typeof structured.image === 'string') {
          images.push(structured.image);
        }
      }
      const domImgs = await page.$$eval('img', nodes => nodes.map(n => n.getAttribute('src') || '').filter(Boolean));
      images.push(...domImgs);
      // Normalize: remove query params for dedupe, keep absolute or protocol-relative
      const seen = new Set();
      images = images
        .map(u => {
          try {
            // strip common size/query params
            const noQuery = u.split('?')[0];
            return noQuery;
          } catch { return u; }
        })
        .filter(u => {
          if (!u) return false;
          // basic heuristic to keep only image-like URLs
          if (!/\.(png|jpe?g|webp|gif|svg)(?:$|\/)/i.test(u)) return false;
          if (seen.has(u)) return false;
            seen.add(u);
            return true;
        })
        .slice(0, 12); // cap to avoid oversized docs
    } catch {
      // swallow image collection errors
    }

    const doc = {
      source: target.id,
      name: target.name,
      url: target.url,
      title: title,
      detected: {
        is_raffle: isRaffle,
        likely_release: hasRelease,
        structured: structured || null,
      },
      images: images,
      snapshot: new Date().toISOString()
    };

    // write to Firestore collection 'sneakers_playwright' for later ingestion
    const col = db.collection(process.env.FIRESTORE_COLLECTION || 'sneakers');
    const docId = `${target.id}::${Date.now()}`;
    await col.doc(docId).set({
      name: doc.name,
      images: doc.images || [],
      metadata: { raw: doc },
      sources: [{ name: target.name, url: target.url, fetchedAt: admin.firestore.Timestamp.now() }],
      last_seen: admin.firestore.Timestamp.now(),
    }, { merge: true });

    console.log(`Wrote snapshot for ${target.id}`);
  } catch (e) {
    console.error(`Error processing ${target.id}:`, e.message || e);
  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  const targetsPath = path.join(process.cwd(), 'scripts/playwright_monitor/targets.json');
  const raw = fs.readFileSync(targetsPath, 'utf-8');
  const cfg = JSON.parse(raw);
  const db = initFirebase();

  for (const t of cfg.targets) {
    console.log('Processing', t.id, t.url);
    await processTarget(chromium, db, t);
  }
  console.log('All targets processed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
