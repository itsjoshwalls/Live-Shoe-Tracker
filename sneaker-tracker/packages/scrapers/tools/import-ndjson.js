#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import axios from 'axios';

// args: file=path/to/file.ndjson or dir=path/to/dir size=100
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...rest] = a.replace(/^--/, '').split('=');
  return [k, rest.join('=') || true];
}));

const apiBase = process.env.API_BASE_URL || process.env.SNEAKER_API_BASE_URL;
if (!apiBase) {
  console.error('Set API_BASE_URL or SNEAKER_API_BASE_URL to import into the API.');
  process.exit(1);
}
const endpoint = `${apiBase.replace(/\/$/, '')}/api/releases/enhanced/batch`;
const batchSize = parseInt(args.size || '100', 10);

async function importFile(file) {
  console.log(`Importing ${file} -> ${endpoint}`);
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity
  });
  let batch = [];
  let total = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      batch.push(obj);
      if (batch.length >= batchSize) {
        await axios.post(endpoint, batch, { timeout: 30000 });
        total += batch.length;
        batch = [];
      }
    } catch (e) {
      console.error('Skipping invalid JSON line');
    }
  }
  if (batch.length) {
    await axios.post(endpoint, batch, { timeout: 30000 });
    total += batch.length;
  }
  console.log(`Imported ${total} rows from ${path.basename(file)}`);
}

(async () => {
  try {
    if (args.file) {
      await importFile(path.resolve(args.file));
    } else if (args.dir) {
      const dir = path.resolve(args.dir);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.ndjson'));
      for (const f of files) {
        await importFile(path.join(dir, f));
      }
    } else {
      console.error('Usage: pnpm --filter @sneaker-tracker/scrapers run import:ndjson -- file=path.ndjson | dir=folder [size=100]');
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    console.error('Import failed:', e?.message || e);
    process.exit(2);
  }
})();
