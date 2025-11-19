#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Simple argv parser: supports name=foo type=shopify/custom domain=example.com enabled=true/false
const parseArgs = (argv) => {
  const out = {};
  for (const arg of argv) {
    const a = arg.replace(/^--/, '');
    const [k, ...rest] = a.split('=');
    if (!k) continue;
    const v = rest.join('=');
    if (v === '') out[k] = true; else if (v === 'true') out[k] = true; else if (v === 'false') out[k] = false; else out[k] = v;
  }
  return out;
};

const args = parseArgs(process.argv.slice(2));
const name = args.name || args.store || args.key;
const type = (args.type || 'shopify').toLowerCase();
const domain = args.domain;
const enabled = args.enabled === true || args.enabled === 'true' || false;

if (!name) {
  console.error('Usage: pnpm --filter @sneaker-tracker/scrapers run gen -- name=<storeKey> [type=shopify|custom] [domain=example.com] [enabled=true|false]');
  process.exit(1);
}
if (type === 'shopify' && !domain) {
  console.error('For type=shopify, please provide domain=<example.com>');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const configPath = path.join(pkgRoot, 'config.js');
const scrapersDir = path.join(pkgRoot, 'scrapers');

const exists = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
if (!exists.includes('export const STORES =')) {
  console.error('Could not locate export const STORES in config.js');
  process.exit(1);
}

// Avoid duplicates
const keyRegex = new RegExp(`\\b${name}\\s*:`);
if (keyRegex.test(exists)) {
  console.log(`Entry '${name}' already exists in config.js (skipping registry update).`);
} else {
  // Build entry
  let entry;
  if (type === 'shopify') {
    entry = `  ${name}: { type: 'shopify', domain: '${domain}', module: './scrapers/${name}.js', enabled: ${enabled} },\n`;
  } else {
    entry = `  ${name}: { type: 'custom', module: './scrapers/${name}.js', enabled: ${enabled} },\n`;
  }

  // Insert before the real closing brace of the STORES object using brace matching
  const startDecl = exists.indexOf('export const STORES =');
  const braceStart = exists.indexOf('{', startDecl);
  if (braceStart === -1) {
    console.error('Could not locate STORES object opening brace');
    process.exit(1);
  }
  let depth = 0;
  let closeIdx = -1;
  for (let i = braceStart; i < exists.length; i++) {
    const ch = exists[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { closeIdx = i; break; }
    }
  }
  if (closeIdx === -1) {
    console.error('Could not match closing brace for STORES object');
    process.exit(1);
  }
  // Ensure there is a trailing comma before inserting a new property
  let insertPrefix = '\n';
  let j = closeIdx - 1;
  while (j > 0 && /\s/.test(exists[j])) j--;
  if (exists[j] !== ',' && exists[j] !== '{') {
    insertPrefix = ',\n';
  }
  const updated = exists.slice(0, closeIdx) + insertPrefix + entry + exists.slice(closeIdx);
  fs.writeFileSync(configPath, updated, 'utf8');
  console.log(`Added '${name}' to config.js as ${type}${type === 'shopify' ? ` (${domain})` : ''}.`);
}

// Create custom scraper stub if requested or helpful
if (type === 'custom') {
  fs.mkdirSync(scrapersDir, { recursive: true });
  const filePath = path.join(scrapersDir, `${name}.js`);
  if (!fs.existsSync(filePath)) {
    const stub = `import { BaseScraper } from './core/baseScraper.js';\n\nexport default class ${name.replace(/[^a-zA-Z0-9_]/g, '')}Scraper extends BaseScraper {\n  constructor() {\n    super({ name: '${name}', baseUrl: '' });\n  }\n  async fetchReleases() {\n    // TODO: Implement releases fetch for ${name}\n    return [];\n  }\n}\n`;
    fs.writeFileSync(filePath, stub, 'utf8');
    console.log(`Created custom scraper stub: scrapers/${name}.js`);
  } else {
    console.log(`Custom scraper file already exists: scrapers/${name}.js`);
  }
} else {
  console.log('Shopify type uses generic ShopifyScraper; no custom file required.');
}

console.log('Done.');
