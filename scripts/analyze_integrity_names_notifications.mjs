#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const cliArg = process.argv[2];
  const url = cliArg || process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) throw new Error('DB URL missing. Provide as arg or env.');
  return url;
}

function print(title, rows) {
  console.log(`\n=== ${title} ===`);
  console.table(rows);
}

async function main() {
  const sql = neon(getDbUrl());

  const customersGeneric = await sql`
    SELECT id, name, email, created_at
    FROM users
    WHERE user_type = 'customer' AND (LOWER(name) IN ('loyalty customer','customer','unknown customer') OR name IS NULL OR name = '')
    ORDER BY created_at DESC LIMIT 50
  `;
  print('Customers with generic/missing names', customersGeneric);

  const compare = await sql`
    SELECT id, name, email FROM users WHERE id IN (4,27)
    UNION ALL
    SELECT id, name, email FROM users WHERE user_type = 'customer' AND id NOT IN (4,27) AND created_at > '2024-01-01'
    LIMIT 50
  `;
  print('Compare working vs recent customers', compare);

  const notifJoin = await sql`
    SELECT 
      n.id, n.customer_id, n.business_id, n.type, n.title, n.created_at,
      (n.data->>'programId') as data_program_id,
      (n.data->>'programName') as data_program_name,
      (n.data->>'businessName') as data_business_name,
      u.name as business_name_join,
      lp.name as program_name_join
    FROM customer_notifications n
    LEFT JOIN loyalty_programs lp ON (n.data->>'programId')::int = lp.id
    LEFT JOIN users u ON n.business_id = u.id
    ORDER BY n.created_at DESC
    LIMIT 20
  `;
  print('Recent notifications with joins', notifJoin);

  const numericNameNotifs = await sql`
    SELECT id, type, title, message
    FROM customer_notifications
    WHERE message ~ '\\b[0-9]+\\b' AND (type = 'POINTS_ADDED' OR type = 'ENROLLMENT')
    ORDER BY created_at DESC
    LIMIT 20
  `;
  print('Notifications possibly showing numeric IDs in messages', numericNameNotifs);

  const enrollTrace = await sql`
    SELECT 
      ar.id as request_id,
      ar.customer_id,
      ar.entity_id as program_id_text,
      lp.id as program_id,
      lp.name as program_name,
      u.name as customer_name,
      pe.status as enrollment_status,
      lc.id as card_id
    FROM customer_approval_requests ar
    LEFT JOIN loyalty_programs lp ON (CASE WHEN ar.entity_id ~ '^[0-9]+$' THEN ar.entity_id::int ELSE -1 END) = lp.id
    LEFT JOIN users u ON ar.customer_id = u.id
    LEFT JOIN program_enrollments pe ON (pe.customer_id = ar.customer_id AND pe.program_id = (CASE WHEN ar.entity_id ~ '^[0-9]+$' THEN ar.entity_id::int ELSE -1 END))
    LEFT JOIN loyalty_cards lc ON (lc.customer_id = ar.customer_id AND lc.program_id = (CASE WHEN ar.entity_id ~ '^[0-9]+$' THEN ar.entity_id::int ELSE -1 END))
    WHERE ar.created_at > NOW() - INTERVAL '7 days'
    ORDER BY ar.created_at DESC
    LIMIT 30
  `;
  print('Enrollment trace (7 days)', enrollTrace);

  console.log('\nDone.');
}

main().catch(err => { console.error('Integrity analysis failed:', err); process.exit(1); });


