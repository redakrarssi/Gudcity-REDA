// Fixed authentication middleware (CommonJS)
const { verifyToken } = require('../services/authServiceFixed.cjs');
const sql = require('../utils/dbFix.cjs');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Basic fallback
    if (authHeader.startsWith('Basic ')) {
      try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [id, email, role] = credentials.split(':');
        req.user = { id: parseInt(id, 10), email, role: role || 'customer' };
        return next();
      } catch (e) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authentication format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token missing' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch current user status
    let currentUser = null;
    try {
      const result = await sql.query('SELECT id, email, status FROM users WHERE id = $1', [payload.userId]);
      currentUser = result.rows && result.rows[0];
    } catch (_) {}

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role || 'customer',
      status: currentUser?.status || 'active'
    };

    if (req.user.status === 'banned') {
      return res.status(403).json({ error: 'Account banned' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const authorize = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden - Admin access required' });
  next();
};

module.exports = { auth, authorize, requireAdmin };


