/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import admin from 'firebase-admin';

const PROJECT_ROOT = path.resolve(new URL(import.meta.url).pathname, '../../..');

function initFirebase() {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saJson) {
    console.error('FIREBASE_SERVICE_ACCOUNT is required but not set.');
    console.error('Tip (PowerShell):');
    console.error("$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\\\path\\\to\\\service-account.json' -Raw");
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
  try {
    await page.goto(target.url, { timeout: 45000 });
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isRaffle = /raffle|entry|draw|raffle entry/i.test(bodyText);
    const hasRelease = /release|coming soon|launch/i.test(bodyText);
    const structured = await extractStructuredData(page);

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
      snapshot: new Date().toISOString()
    };

    // write to Firestore collection 'sneakers_playwright' for later ingestion
    const col = db.collection(process.env.FIRESTORE_COLLECTION || 'sneakers');
    const docId = `${target.id}::${Date.now()}`;
    await col.doc(docId).set({
      name: doc.name,
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
