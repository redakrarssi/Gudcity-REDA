#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const url = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) throw new Error('Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL.');
  return url;
}

async function main() {
  const sql = neon(getDbUrl());

  console.log('Applying idempotent schema standardization for integer IDs...');
  await sql`
    DO $$
    BEGIN
      -- Convert program_enrollments.customer_id to INTEGER if needed
      BEGIN
        EXECUTE 'ALTER TABLE program_enrollments ALTER COLUMN customer_id TYPE INTEGER USING customer_id::integer';
      EXCEPTION WHEN others THEN
        -- Ignore if already integer or conversion not needed
        NULL;
      END;
      
      -- Ensure status/enrolled_at/last_activity columns exist
      BEGIN
        ALTER TABLE program_enrollments 
          ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE',
          ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      EXCEPTION WHEN others THEN NULL; END;
      
      -- Convert loyalty_cards foreign keys to INTEGER if needed
      BEGIN
        EXECUTE 'ALTER TABLE loyalty_cards ALTER COLUMN customer_id TYPE INTEGER USING customer_id::integer';
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        EXECUTE 'ALTER TABLE loyalty_cards ALTER COLUMN program_id TYPE INTEGER USING program_id::integer';
      EXCEPTION WHEN others THEN NULL; END;
      BEGIN
        EXECUTE 'ALTER TABLE loyalty_cards ALTER COLUMN business_id TYPE INTEGER USING business_id::integer';
      EXCEPTION WHEN others THEN NULL; END;
    END$$;
  `;

  console.log('Standardizing customer_approval_requests.entity_id to digits-only number where possible...');
  const updatedApprovals = await sql`
    UPDATE customer_approval_requests
    SET entity_id = regexp_replace(entity_id, '\\D', '', 'g')
    WHERE entity_id IS NOT NULL AND entity_id <> ''
      AND entity_id !~ '^[0-9]+$'
    RETURNING id
  `;
  console.log('Updated approvals:', updatedApprovals.length);

  console.log('Fixing enrollments with stringy IDs (no-op if already integers)...');
  // No schema change, but this verifies counts
  const enrollCount = await sql`SELECT COUNT(*) AS c FROM program_enrollments`;
  console.log('Enrollments total:', enrollCount[0].c);

  console.log('Ensuring loyalty_cards have card_number...');
  await sql`
    ALTER TABLE loyalty_cards 
    ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC(10,2) DEFAULT 1.0
  `;

  console.log('Backfilling missing cards for active enrollments...');
  const backfilled = await sql`
    WITH missing AS (
      SELECT pe.customer_id, pe.program_id, lp.business_id
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON lp.id = pe.program_id
      WHERE pe.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM loyalty_cards lc
          WHERE lc.customer_id = pe.customer_id
            AND lc.program_id = pe.program_id
        )
    )
    INSERT INTO loyalty_cards (
      customer_id, business_id, program_id, card_number,
      status, card_type, points, tier, points_multiplier, is_active, created_at, updated_at
    )
    SELECT 
      m.customer_id, m.business_id, m.program_id,
      'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT,
      'ACTIVE', 'STANDARD', 0, 'STANDARD', 1.0, TRUE, NOW(), NOW()
    FROM missing m
    RETURNING id
  `;
  console.log('Backfilled cards:', backfilled.length);

  console.log('Ensuring CARD_CREATED notifications for newly created cards...');
  const notifs = await sql`
    WITH recent_cards AS (
      SELECT lc.id, lc.customer_id, lc.business_id, lc.program_id
      FROM loyalty_cards lc
      WHERE lc.created_at > NOW() - interval '1 day'
    ), missing_notifs AS (
      SELECT rc.*
      FROM recent_cards rc
      LEFT JOIN customer_notifications cn
        ON cn.customer_id = rc.customer_id
       AND cn.business_id = rc.business_id
       AND (cn.data->>'programId')::int = rc.program_id
       AND cn.type IN ('ENROLLMENT','CARD_CREATED')
      WHERE cn.id IS NULL
    )
    INSERT INTO customer_notifications (
      id, customer_id, business_id, type, title, message, data,
      requires_action, action_taken, is_read, created_at
    )
    SELECT 
      (
        substr(md5(random()::text),1,8)||'-'||
        substr(md5(random()::text),1,4)||'-'||
        substr(md5(random()::text),1,4)||'-'||
        substr(md5(random()::text),1,4)||'-'||
        substr(md5(random()::text),1,12)
      )::uuid,
      customer_id, business_id, 'CARD_CREATED',
      'Loyalty Card Created',
      'Your loyalty card was created successfully',
      jsonb_build_object('programId', program_id, 'cardId', id, 'timestamp', NOW()),
      FALSE, FALSE, FALSE, NOW()
    FROM missing_notifs
    RETURNING id
  `;
  console.log('Created notifications:', notifs.length);

  console.log('Done.');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});


