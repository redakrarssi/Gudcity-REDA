import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

console.log('Updating loyalty_programs table schema...');

if (!DATABASE_URL) {
  console.log('No DATABASE_URL found in environment variables');
  console.log('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateLoyaltyProgramsTable() {
  try {
    await client.connect();
    console.log('Connected to the database');

    // Start transaction
    await client.query('BEGIN');

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
      console.log('Table loyalty_programs does not exist! Creating it...');
      
      // Read the schema from file
      try {
        const schemaSQL = readFileSync('./db/loyalty_schema.sql', 'utf8');
        await client.query(schemaSQL);
        console.log('Created loyalty_programs table from schema file');
      } catch (readError) {
        console.error('Error reading schema file:', readError);
        throw readError;
      }
    } else {
      console.log('Table loyalty_programs exists. Checking for points_value column...');

      // Check if the points_value column exists
      const pointsValueCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'loyalty_programs'
          AND column_name = 'points_value'
        );
      `);

      const pointsValueExists = pointsValueCheck.rows[0].exists;

      if (pointsValueExists) {
        console.log('points_value column already exists');
      } else {
        // Check if point_value exists instead
        const pointValueCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'loyalty_programs'
            AND column_name = 'point_value'
          );
        `);

        const pointValueExists = pointValueCheck.rows[0].exists;

        if (pointValueExists) {
          console.log('point_value column exists. Adding points_value as an alias...');
          
          // Add points_value as a computed column alias of point_value
          await client.query(`
            ALTER TABLE loyalty_programs
            ADD COLUMN points_value NUMERIC(10, 2) GENERATED ALWAYS AS (point_value) STORED;
          `);
          console.log('Successfully added points_value as a computed column');
        } else {
          console.log('Neither point_value nor points_value exists. Adding both columns...');
          
          // Add both columns if neither exists
          await client.query(`
            ALTER TABLE loyalty_programs
            ADD COLUMN point_value NUMERIC(10, 2) DEFAULT 1.0,
            ADD COLUMN points_value NUMERIC(10, 2) GENERATED ALWAYS AS (point_value) STORED;
          `);
          console.log('Successfully added point_value and points_value columns');
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Schema update completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating database schema:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

updateLoyaltyProgramsTable(); 