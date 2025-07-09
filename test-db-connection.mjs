import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined' : 'Not defined');

try {
  // Create database connection
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 10
  });

  // Test query
  sql`SELECT 1 as test`.then(result => {
    console.log('Connection successful!');
    console.log('Result:', result);
    
    // Close the connection
    sql.end().then(() => {
      console.log('Connection closed.');
      process.exit(0);
    });
  }).catch(error => {
    console.error('Query error:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('Connection error:', error);
  process.exit(1);
} 