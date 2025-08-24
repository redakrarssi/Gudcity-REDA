import sql from '../src/utils/db';

async function main() {
  console.log('Backfilling enrollments to cards...');
  // Create cards for any ACTIVE enrollments missing cards
  const rows = await sql`
    SELECT pe.customer_id, pe.program_id, lp.business_id
    FROM program_enrollments pe
    JOIN loyalty_programs lp ON pe.program_id = lp.id
    LEFT JOIN loyalty_cards lc
      ON lc.customer_id = pe.customer_id AND lc.program_id = pe.program_id
    WHERE pe.status = 'ACTIVE' AND lc.id IS NULL
  `;

  for (const r of rows) {
    try {
      const cardNum = 'GC-' + String(r.customer_id).padStart(4, '0') + '-' + String(r.program_id).padStart(4, '0') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const inserted = await sql`
        INSERT INTO loyalty_cards (
          customer_id, program_id, business_id, card_number,
          status, points, card_type, tier, points_multiplier, is_active, created_at, updated_at
        ) VALUES (
          ${r.customer_id}, ${r.program_id}, ${r.business_id}, ${cardNum},
          'ACTIVE', 0, 'STANDARD', 'STANDARD', 1.0, TRUE, NOW(), NOW()
        ) RETURNING id
      `;
      console.log('Created card', inserted[0].id, 'for', r.customer_id, 'program', r.program_id);
    } catch (e) {
      console.warn('Failed creating card for', r.customer_id, r.program_id, e);
    }
  }
  console.log('Backfill complete.');
}

main().catch(err => {
  console.error('Backfill error', err);
  process.exit(1);
});


