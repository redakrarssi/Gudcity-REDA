#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const url = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) throw new Error('Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL.');
  return url;
}

function log(title, obj) {
  console.log(`\n=== ${title} ===`);
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
}

async function main() {
  const sql = neon(getDbUrl());

  const candidates = await sql`
    SELECT DISTINCT customer_id
    FROM customer_approval_requests
    WHERE request_type = 'ENROLLMENT'
    ORDER BY customer_id ASC
    LIMIT 20
  `;
  log('Candidate customer_ids', candidates);

  for (const row of candidates) {
    const customerId = row.customer_id;
    const approvals = await sql`
      SELECT id, entity_id, status
      FROM customer_approval_requests
      WHERE customer_id = ${customerId} AND request_type = 'ENROLLMENT'
      ORDER BY created_at DESC
      LIMIT 3
    `;
    log(`Approvals for customer ${customerId}`, approvals);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});


