import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const pool = new Pool({
  connectionString: "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """,
  ssl: true
});

async function main() {
  try {
    console.log('Checking table constraints...');
    
    // Check program_enrollments table
    console.log('\n--- program_enrollments table ---');
    
    // Check if table exists
    const programEnrollmentsExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'program_enrollments'
      );
    `);
    
    if (!programEnrollmentsExists.rows[0].exists) {
      console.log('❌ program_enrollments table does not exist!');
    } else {
      console.log('✅ program_enrollments table exists');
      
      // Check columns
      const programEnrollmentsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'program_enrollments'
        ORDER BY ordinal_position;
      `);
      
      console.log('Columns:');
      programEnrollmentsColumns.rows.forEach(column => {
        console.log(`  ${column.column_name} (${column.data_type})`);
      });
      
      // Check constraints
      const programEnrollmentsConstraints = await pool.query(`
        SELECT con.conname as constraint_name,
               con.contype as constraint_type,
               pg_get_constraintdef(con.oid) as constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'program_enrollments'
        AND nsp.nspname = 'public';
      `);
      
      console.log('\nConstraints:');
      if (programEnrollmentsConstraints.rows.length === 0) {
        console.log('  No constraints found');
      } else {
        programEnrollmentsConstraints.rows.forEach(constraint => {
          console.log(`  ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.constraint_definition}`);
        });
      }
    }
    
    // Check loyalty_cards table
    console.log('\n--- loyalty_cards table ---');
    
    // Check if table exists
    const loyaltyCardsExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'loyalty_cards'
      );
    `);
    
    if (!loyaltyCardsExists.rows[0].exists) {
      console.log('❌ loyalty_cards table does not exist!');
    } else {
      console.log('✅ loyalty_cards table exists');
      
      // Check columns
      const loyaltyCardsColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loyalty_cards'
        ORDER BY ordinal_position;
      `);
      
      console.log('Columns:');
      loyaltyCardsColumns.rows.forEach(column => {
        console.log(`  ${column.column_name} (${column.data_type})`);
      });
      
      // Check constraints
      const loyaltyCardsConstraints = await pool.query(`
        SELECT con.conname as constraint_name,
               con.contype as constraint_type,
               pg_get_constraintdef(con.oid) as constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'loyalty_cards'
        AND nsp.nspname = 'public';
      `);
      
      console.log('\nConstraints:');
      if (loyaltyCardsConstraints.rows.length === 0) {
        console.log('  No constraints found');
      } else {
        loyaltyCardsConstraints.rows.forEach(constraint => {
          console.log(`  ${constraint.constraint_name} (${constraint.constraint_type}): ${constraint.constraint_definition}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking table constraints:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 