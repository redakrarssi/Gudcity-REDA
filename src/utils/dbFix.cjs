// Fixed database connection utility (CommonJS)
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('⚠️ DATABASE_URL not found in environment variables!');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { query };


