import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const FALLBACK_URL = '';

function getDbUrl() {
  const url = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || FALLBACK_URL;
  if (!url) {
    throw new Error('Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL.');
  }
  return url;
}

async function main() {
  const dbUrl = getDbUrl();
  console.log('DB URL source:', process.env.VITE_DATABASE_URL ? 'VITE_DATABASE_URL' : (process.env.DATABASE_URL ? 'DATABASE_URL' : 'FALLBACK_URL'));

  const sql = neon(dbUrl);

  // Tables to check
  const tablesToCheck = [
    'program_enrollments',
    'loyalty_cards',
    'customer_approval_requests',
    'customer_notifications',
    'customer_business_relationships',
    'loyalty_programs',
    'customers',
    'users'
  ];

  console.log('\n=== Checking relevant tables exist ===');
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = ANY(${tablesToCheck})
    ORDER BY table_name;
  `;
  console.log('Found tables:', tables.map(r => r.table_name));

  console.log('\n=== program_enrollments columns ===');
  const peCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'program_enrollments'
    ORDER BY ordinal_position;
  `;
  console.table(peCols);

  console.log('\n=== loyalty_cards columns ===');
  const lcCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'loyalty_cards'
    ORDER BY ordinal_position;
  `;
  console.table(lcCols);

  console.log('\n=== Stored procedure signatures for process_enrollment_approval ===');
  const funcs = await sql`
    SELECT proname, oidvectortypes(proargtypes) AS args
    FROM pg_proc
    WHERE proname = 'process_enrollment_approval'
  `;
  console.table(funcs);

  console.log('\n=== Pending ENROLLMENT approval requests for user 4 ===');
  const approvals = await sql`
    SELECT id, customer_id, business_id, request_type, entity_id, status, requested_at
    FROM customer_approval_requests
    WHERE customer_id = ${userId} AND request_type = 'ENROLLMENT'
    ORDER BY requested_at DESC
    LIMIT 20
  `;
  console.log(JSON.stringify(approvals, null, 2));

  const userId = 4;
  console.log(`\n=== Data for user_id=${userId} in program_enrollments ===`);
  const peRows = await sql`
    SELECT * FROM program_enrollments 
    WHERE (CAST(customer_id AS TEXT)) = ${String(userId)}
    ORDER BY id DESC LIMIT 20;
  `;
  console.log(JSON.stringify(peRows, null, 2));

  console.log(`\n=== Data for user_id=${userId} in loyalty_cards ===`);
  const lcRows = await sql`
    SELECT * FROM loyalty_cards 
    WHERE customer_id = ${userId}
    ORDER BY id DESC LIMIT 20;
  `;
  console.log(JSON.stringify(lcRows, null, 2));
}

main().catch(err => {
  console.error('DB probe failed:', err);
  process.exit(1);
});


