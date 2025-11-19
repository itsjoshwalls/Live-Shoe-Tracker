// Import NDJSON files to Firestore
// Usage: node tools/import-to-firestore.js output/undefeated-*.ndjson
import fs from 'node:fs';
import { batchUpsertToFirestore } from '../handlers/firestoreHandler.js';

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node tools/import-to-firestore.js <ndjson-file>');
  process.exit(1);
}

const file = args[0];
if (!fs.existsSync(file)) {
  console.error(`❌ File not found: ${file}`);
  process.exit(1);
}

console.log(`📂 Reading: ${file}`);
const content = fs.readFileSync(file, 'utf-8');
const lines = content.trim().split('\n').filter(l => l.trim());
const releases = lines.map(line => JSON.parse(line));

console.log(`📦 Parsed ${releases.length} releases`);

const collectionName = process.env.FIRESTORE_COLLECTION || 'releases';
const result = await batchUpsertToFirestore(releases, collectionName);

console.log(`\n📊 Summary for ${file}:`);
console.log(`   ✅ Inserted/updated: ${result.inserted}`);
console.log(`   ❌ Errors: ${result.errors}`);
if (result.skipped) {
  console.log(`   ⏭️  Skipped (no Firestore): ${result.skipped}`);
}
