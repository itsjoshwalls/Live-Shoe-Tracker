#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nSet them with:');
  console.error('$env:SUPABASE_URL = "https://your-project.supabase.co"');
  console.error('$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node apply-migration.js <migration-file.sql>');
  process.exit(1);
}

const filePath = path.resolve(migrationFile);
if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf-8');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log(`📂 Applying migration: ${path.basename(filePath)}`);
console.log(`📍 Target: ${SUPABASE_URL}`);

try {
  // Execute SQL via RPC call to a custom function, or use REST API directly
  // Note: Supabase doesn't have a direct SQL execution endpoint in the JS client
  // This would require either:
  // 1. Using Supabase CLI (recommended)
  // 2. Creating a Postgres function and calling via RPC
  // 3. Using a direct Postgres connection library
  
  console.log('\n⚠️  Direct SQL execution not supported via JS client.');
  console.log('Please use one of these methods instead:\n');
  console.log('1. Supabase Dashboard SQL Editor (easiest)');
  console.log('   → https://supabase.com/dashboard/project/zaarnclwuiwxxtecrvvs/sql\n');
  console.log('2. Supabase CLI:');
  console.log('   → supabase db push --file ' + filePath + '\n');
  console.log('3. Direct Postgres connection:');
  console.log('   → psql -h db.zaarnclwuiwxxtecrvvs.supabase.co -U postgres -d postgres -f ' + filePath);
  
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
