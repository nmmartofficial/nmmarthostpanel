import pg from 'pg';

const { Client } = pg;
const conn = 'postgresql://postgres.mggkadgemqcyybsplkqc:NmMartSecure2026@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
const client = new Client({ connectionString: conn });

try {
  await client.connect();
  const products = await client.query("SELECT company_code, COUNT(*)::int AS cnt FROM public.products GROUP BY company_code ORDER BY cnt DESC LIMIT 20");
  const companies = await client.query("SELECT id, company_code, company_slug, name FROM public.companies ORDER BY id LIMIT 20");
  console.log('PRODUCTS=' + JSON.stringify(products.rows));
  console.log('COMPANIES=' + JSON.stringify(companies.rows));
} catch (err) {
  console.error('ERROR=' + err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
