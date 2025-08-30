// Fixed database connection utility
const { Pool } = require('pg');
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database URL from environment variables
const DATABASE_URL = process.env.VITE_DATABASE_URL || '';

// Check if database URL is available
if (!DATABASE_URL) {
  console.error('⚠️ DATABASE_URL not found in environment variables!');
  console.error('Please ensure the VITE_DATABASE_URL is set in your .env file');
  process.exit(1);
}

// Connection states
const ConnectionState = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting'
};

// Database connection pool for server-side
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Test the connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// For client-side serverless connections
const neonClient = neon(DATABASE_URL);

// SQL query helper function for server-side
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed in', duration, 'ms');
    return res;
  } catch (error) {
    console.error('Error executing query:', error.message);
    throw error;
  }
}

// SQL tag template for serverless connections
function sql(strings, ...values) {
  // If first argument is an actual SQL string template
  if (Array.isArray(strings) && strings.raw) {
    return neonClient(strings, ...values);
  } 
  // If first argument is a regular string (for query function)
  else if (typeof strings === 'string') {
    return query(strings, values[0] || []);
  }
}

// Add transaction support
sql.begin = async () => {
  await query('BEGIN');
};

sql.commit = async () => {
  await query('COMMIT');
};

sql.rollback = async () => {
  await query('ROLLBACK');
};

sql.query = query;

module.exports = sql;
