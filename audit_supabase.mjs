import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runAudit() {
  console.log('--- SUPABASE LIVE AUDIT ---');
  console.log('Project URL:', url);

  // 1. Check Tables and RLS
  const tables = ['products', 'orders', 'users', 'categories', 'brands'];

  for (const table of tables) {
    console.log(`\nAuditing Table: ${table}`);
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`  [ERROR] Could not query ${table}:`, error.message);
      if (error.code === '42P01') console.log(`  [HINT] Table ${table} does not exist.`);
    } else {
      console.log(`  [OK] Table accessible. Total rows (visible): ${count}`);
    }
  }

  console.log('\n--- AUDIT COMPLETE ---');
}

runAudit();
