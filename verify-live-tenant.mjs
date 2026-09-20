import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verify() {
  console.log('Checking live data structure...');

  // Peek into 1 product to see its tenant fields
  const { data, error } = await supabase
    .from('products')
    .select('id, name, tenant_id, company_code')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Sample Product Data Found:');
    console.log('Name:', data[0].name);
    console.log('Tenant ID in DB:', data[0].tenant_id);
    console.log('Company Code in DB:', data[0].company_code);
  } else {
    console.log('No products found to verify tenant.');
  }
}

verify();
