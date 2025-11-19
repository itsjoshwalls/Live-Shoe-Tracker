#!/usr/bin/env node
/**
 * Import NDJSON release files from output/ directory to Supabase
 * Usage: node tools/import-to-supabase.js [filename]
 * Example: node tools/import-to-supabase.js output/undefeated-1763096563462.ndjson
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer service role for writes; fall back to anon if not provided
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const KEY_TYPE = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : (process.env.SUPABASE_ANON_KEY ? 'anon' : 'none');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in your environment:');
  console.error('  $env:SUPABASE_URL = "https://your-project.supabase.co"');
  console.error('  $env:SUPABASE_ANON_KEY = "your-anon-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log(`🔐 Using Supabase key type: ${KEY_TYPE} (${SUPABASE_URL})`);

/**
 * Import a single NDJSON file to Supabase releases table
 */
async function importFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }

  console.log(`📂 Reading: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.trim());
  const releases = lines.map(line => JSON.parse(line));

  console.log(`📦 Parsed ${releases.length} releases`);

  // Transform to Supabase schema
  const records = releases.map(r => ({
    name: r.name,
    sku: r.sku || null,
    release_date: r.date || null,
    status: r.status || 'upcoming',
    price: r.price || null,
    currency: r.currency || 'USD',
    brand: r.brand || null,
    retailer: r.metadata?.retailer || null,
    url: r.metadata?.url || null,
    images: r.images || (r.metadata?.raw?.image ? [r.metadata.raw.image] : null),
    metadata: r.metadata || {},
  }));

  // Batch insert with upsert (conflict on sku+retailer)
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await supabase
        .from('releases')
        .upsert(batch, { onConflict: 'sku,retailer', ignoreDuplicates: false });

      if (error) {
        const details = error?.details || error?.hint || '';
        console.error(`❌ Batch ${i}-${i + batch.length} failed:`, error.message, details);
        errors += batch.length;
      } else {
        inserted += batch.length;
        console.log(`✅ Batch ${i}-${i + batch.length} inserted`);
      }
    } catch (err) {
      const msg = err?.message || String(err);
      console.error(`❌ Batch ${i}-${i + batch.length} exception:`, msg);
      if (/fetch failed/i.test(msg)) {
        console.error('   ↳ Hint: Check network/AV/TLS interception. Try on another network or set SUPABASE_SERVICE_ROLE_KEY.');
      }
      errors += batch.length;
    }
  }

  console.log(`\n📊 Summary for ${path.basename(filePath)}:`);
  console.log(`   ✅ Inserted/updated: ${inserted}`);
  console.log(`   ❌ Errors: ${errors}`);

  return errors === 0;
}

/**
 * Import all NDJSON files from output/ directory
 */
async function importAll() {
  const outputDir = path.resolve(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Output directory not found: ${outputDir}`);
    return;
  }

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.ndjson'));
  if (files.length === 0) {
    console.log('No NDJSON files found in output/');
    return;
  }

  console.log(`Found ${files.length} NDJSON files in output/\n`);

  for (const file of files) {
    const filePath = path.join(outputDir, file);
    await importFile(filePath);
    console.log('');
  }

  console.log('🎉 Import complete!');
}

// CLI execution
const main = async () => {
  const targetFile = process.argv[2];

  if (targetFile) {
    // Import single file
    const filePath = path.isAbsolute(targetFile)
      ? targetFile
      : path.resolve(process.cwd(), targetFile);
    const success = await importFile(filePath);
    process.exit(success ? 0 : 1);
  } else {
    // Import all files from output/
    await importAll();
  }
};

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
