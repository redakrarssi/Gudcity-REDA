#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const cliArg = process.argv[2];
  const url = cliArg || process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) {
    throw new Error('Database URL not found. Pass as first arg or set VITE_DATABASE_URL or DATABASE_URL.');
  }
  return url;
}

function printSection(title) {
  console.log('\n=== ' + title + ' ===');
}

function asTable(rows) {
  if (!rows || rows.length === 0) return '(no rows)';
  const headers = Object.keys(rows[0]);
  const widths = headers.map(h => Math.max(h.length, ...rows.map(r => String(r[h] ?? '').length)));
  const line = (vals) => vals.map((v, i) => String(v).padEnd(widths[i])).join(' | ');
  const sep = widths.map(w => '-'.repeat(w)).join('-|-');
  return [line(headers), sep, ...rows.map(r => line(headers.map(h => r[h] ?? '')))].join('\n');
}

async function main() {
  const sql = neon(getDbUrl());

  printSection('Information Schema: Column Types');
  const info = await sql`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('customer_approval_requests','program_enrollments','loyalty_cards')
    ORDER BY table_name, ordinal_position
  `;
  console.log(asTable(info));

  printSection('customer_approval_requests: entity_id digits vs non-digits');
  const entityCheck = await sql`
    SELECT 
      SUM(CASE WHEN entity_id ~ '^[0-9]+$' THEN 1 ELSE 0 END) AS digits_only,
      SUM(CASE WHEN entity_id IS NULL OR entity_id = '' THEN 1 ELSE 0 END) AS empty_or_null,
      SUM(CASE WHEN entity_id IS NOT NULL AND entity_id <> '' AND entity_id !~ '^[0-9]+$' THEN 1 ELSE 0 END) AS non_digits
    FROM customer_approval_requests
    WHERE request_type = 'ENROLLMENT'
  `;
  console.log(asTable(entityCheck));

  printSection('Sample enroll approvals (excluding users 4 and 27)');
  const sampleApprovals = await sql`
    SELECT id, customer_id, business_id, entity_id, status, request_type, created_at
    FROM customer_approval_requests
    WHERE request_type = 'ENROLLMENT' AND customer_id NOT IN (4,27)
    ORDER BY created_at DESC
    LIMIT 20
  `;
  console.log(asTable(sampleApprovals));

  printSection('program_enrollments: counts and status summary');
  const enrollSummary = await sql`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) AS inactive
    FROM program_enrollments
  `;
  console.log(asTable(enrollSummary));

  printSection('loyalty_cards: count and missing card_number');
  const cardSummary = await sql`
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN card_number IS NULL OR card_number = '' THEN 1 ELSE 0 END) AS missing_number
    FROM loyalty_cards
  `;
  console.log(asTable(cardSummary));

  printSection('Approvals with APPROVED but no enrollment');
  const approvedNoEnroll = await sql`
    SELECT ar.id AS request_id, ar.customer_id, ar.entity_id
    FROM customer_approval_requests ar
    WHERE ar.request_type = 'ENROLLMENT' AND ar.status = 'APPROVED'
      AND NOT EXISTS (
        SELECT 1 FROM program_enrollments pe
        WHERE pe.customer_id = ar.customer_id
          AND pe.program_id = (CASE WHEN ar.entity_id ~ '^[0-9]+$' THEN ar.entity_id::int ELSE -1 END)
      )
    LIMIT 20
  `;
  console.log(asTable(approvedNoEnroll));

  printSection('Cards missing for active enrollments');
  const enrollNoCard = await sql`
    SELECT pe.customer_id, pe.program_id
    FROM program_enrollments pe
    WHERE pe.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM loyalty_cards lc
        WHERE lc.customer_id = pe.customer_id AND lc.program_id = pe.program_id
      )
    LIMIT 20
  `;
  console.log(asTable(enrollNoCard));

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});


