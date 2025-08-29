import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { hashPassword, verifyPassword, generateToken, generateRefreshToken } from '../services/authService';

const router = Router();

// User registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await sql<any[]>`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await sql<any[]>`
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role}, NOW(), NOW())
      RETURNING id, name, email, role, created_at
    `;

    if (!newUser.length) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    const user = newUser[0];

    // Generate tokens
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    return res.status(201).json({
      user: {
        id: Number(user.id),
        name: String(user.name),
        email: String(user.email),
        role: String(user.role),
        created_at: user.created_at
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const rows = await sql<any[]>`
      SELECT id, name, email, password, role, created_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    return res.json({
      user: {
        id: Number(user.id),
        name: String(user.name),
        email: String(user.email),
        role: String(user.role),
        created_at: user.created_at
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token and generate new access token
    // This is a simplified implementation - in production, you'd want proper JWT verification
    const token = generateToken({ id: 'temp', email: 'temp', role: 'temp' });

    return res.json({ token });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;