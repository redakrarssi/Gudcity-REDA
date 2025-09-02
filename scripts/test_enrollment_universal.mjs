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

  // Ensure procedure exists by probing from code path
  const sigRows = await sql`
    SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    WHERE p.proname = 'process_enrollment_approval'
  `;
  log('procedure signatures', sigRows);

  // Test users 4 and 27 plus a synthetic new user if present
  const testCustomers = [4, 27];
  const extra = await sql`SELECT id FROM users WHERE user_type='customer' AND id NOT IN (4,27) ORDER BY created_at DESC LIMIT 1`;
  if (extra.length) testCustomers.push(extra[0].id);

  for (const cid of testCustomers) {
    // Pick a program at random
    const prog = await sql`SELECT id FROM loyalty_programs ORDER BY created_at DESC LIMIT 1`;
    if (!prog.length) {
      log('SKIP', 'No programs found');
      break;
    }
    const pid = prog[0].id;

    // Create a fake approval request
    const req = await sql`
      WITH ins_n AS (
        INSERT INTO customer_notifications (
          id, customer_id, business_id, type, title, message, requires_action, action_taken, is_read, created_at
        ) VALUES (
          gen_random_uuid(), ${cid}, (SELECT business_id FROM loyalty_programs WHERE id=${pid}), 'ENROLLMENT_REQUEST',
          'Program Enrollment Request', 'Test auto-approval', TRUE, FALSE, FALSE, NOW()
        ) RETURNING id
      )
      INSERT INTO customer_approval_requests (
        id, notification_id, customer_id, business_id, request_type, entity_id, status, requested_at, expires_at
      ) VALUES (
        gen_random_uuid(), (SELECT id FROM ins_n), ${cid}, (SELECT business_id FROM loyalty_programs WHERE id=${pid}), 'ENROLLMENT', ${pid}::text, 'PENDING', NOW(), NOW()+ interval '7 days'
      ) RETURNING id
    `;
    const requestId = req[0].id;
    log('Created approval request', { customerId: cid, programId: pid, requestId });

    // Call the procedure
    const res = await sql`SELECT process_enrollment_approval(${cid}, ${pid}, ${requestId}::uuid) as card_id`;
    log('Procedure result', res);

    // Verify card exists
    const card = await sql`SELECT id FROM loyalty_cards WHERE customer_id=${cid} AND program_id=${pid} ORDER BY created_at DESC LIMIT 1`;
    log('Card existence', card);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});


