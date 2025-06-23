import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

console.log('Checking loyalty_programs table structure...');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('No DATABASE_URL found in environment variables');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkLoyaltyProgramsTable() {
  try {
    await client.connect();
    console.log('Connected to the database');

    // Check if the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'loyalty_programs'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('Table loyalty_programs does not exist!');
      return;
    }

    console.log('Table loyalty_programs exists. Checking columns...');

    // Get column information
    const columnQuery = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'loyalty_programs'
      ORDER BY ordinal_position;
    `);

    console.log('Columns in loyalty_programs table:');
    columnQuery.rows.forEach(column => {
      console.log(`- ${column.column_name}: ${column.data_type}${column.character_maximum_length ? `(${column.character_maximum_length})` : ''}`);
    });

    // Check if points_value or point_value exists
    const pointValueCheck = columnQuery.rows.some(col => col.column_name === 'points_value');
    const pointValueAlternativeCheck = columnQuery.rows.some(col => col.column_name === 'point_value');

    console.log('\nPoint value column check:');
    console.log(`- points_value exists: ${pointValueCheck}`);
    console.log(`- point_value exists: ${pointValueAlternativeCheck}`);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

checkLoyaltyProgramsTable(); 