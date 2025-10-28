// CommonJS wrapper around authServiceFixed
const jwt = require('jsonwebtoken');
let sql;
try {
  sql = require('../utils/dbFix.cjs');
} catch (e) {
  sql = require('../utils/dbFix');
}

const env = {
  JWT_SECRET: process.env.VITE_JWT_SECRET || process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.VITE_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRY: process.env.VITE_JWT_EXPIRY || '1h',
  JWT_REFRESH_EXPIRY: process.env.VITE_JWT_REFRESH_EXPIRY || '7d'
};

function parseJwtExpiry(expiry) {
  const match = String(expiry).match(/^(\d+)([smhdw])$/);
  if (!match) return 3600;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    case 'w': return value * 604800;
    default: return 3600;
  }
}

async function storeRefreshToken(userId, token, expiresIn) {
  try {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP
      )
    `);
    await sql.query(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, token, expiresAt]);
  } catch (e) {
    // non-fatal
  }
}

function generateTokens(user) {
  if (!env.JWT_SECRET) throw new Error('JWT access token secret is not configured');
  if (!env.JWT_REFRESH_SECRET) throw new Error('JWT refresh token secret is not configured');
  const payload = { userId: user.id, email: user.email, role: user.role || 'customer' };
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY,
    issuer: 'gudcity-loyalty-platform',
    audience: 'gudcity-users'
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
    issuer: 'gudcity-loyalty-platform',
    audience: 'gudcity-users'
  });
  storeRefreshToken(user.id, refreshToken, parseJwtExpiry(env.JWT_REFRESH_EXPIRY)).catch(() => {});
  return { accessToken, refreshToken, expiresIn: parseJwtExpiry(env.JWT_EXPIRY) };
}

function verifyToken(token) {
  if (!env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET, { issuer: 'gudcity-loyalty-platform', audience: 'gudcity-users', clockTolerance: 5 });
  } catch {
    return null;
  }
}

module.exports = { generateTokens, verifyToken, parseJwtExpiry };


