import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import sql from '../utils/db';

const router = Router();

async function ensureUserSettingsColumns(): Promise<void> {
  // Add missing columns if they don't exist to support settings functionality
  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
      "email_notifications": true,
      "login_alerts": true,
      "system_updates": true
    }'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  `;
}

router.get('/me/settings', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await ensureUserSettingsColumns();

    const rows = await sql<any[]>`
      SELECT id, name, email, role, phone, avatar_url, two_factor_enabled, notification_settings, created_at, updated_at
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = rows[0];
    const notificationSettings = typeof u.notification_settings === 'string'
      ? JSON.parse(u.notification_settings)
      : (u.notification_settings || { email_notifications: true, login_alerts: true, system_updates: true });

    return res.json({
      id: Number(u.id),
      name: String(u.name || ''),
      email: String(u.email || ''),
      phone: u.phone ? String(u.phone) : '',
      role: String(u.role || 'user'),
      avatar_url: u.avatar_url ? String(u.avatar_url) : '',
      two_factor_enabled: Boolean(u.two_factor_enabled),
      notification_settings: notificationSettings,
      created_at: u.created_at,
      updated_at: u.updated_at
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me/settings', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    await ensureUserSettingsColumns();

    const { name, email, phone, avatar_url, two_factor_enabled, notification_settings } = req.body || {};

    await sql`
      UPDATE users SET
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        phone = COALESCE(${phone}, phone),
        avatar_url = COALESCE(${avatar_url}, avatar_url),
        two_factor_enabled = COALESCE(${two_factor_enabled}, two_factor_enabled),
        notification_settings = COALESCE(${notification_settings ? JSON.stringify(notification_settings) : null}, notification_settings),
        updated_at = NOW()
      WHERE id = ${req.user.id}
    `;

    // Return latest
    const rows = await sql<any[]>`
      SELECT id, name, email, role, phone, avatar_url, two_factor_enabled, notification_settings, created_at, updated_at
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;

    const u = rows[0];
    const notificationSettings = typeof u.notification_settings === 'string'
      ? JSON.parse(u.notification_settings)
      : (u.notification_settings || { email_notifications: true, login_alerts: true, system_updates: true });

    return res.json({
      id: Number(u.id),
      name: String(u.name || ''),
      email: String(u.email || ''),
      phone: u.phone ? String(u.phone) : '',
      role: String(u.role || 'user'),
      avatar_url: u.avatar_url ? String(u.avatar_url) : '',
      two_factor_enabled: Boolean(u.two_factor_enabled),
      notification_settings: notificationSettings,
      created_at: u.created_at,
      updated_at: u.updated_at
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me/password', auth, async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing currentPassword or newPassword' });
    }

    const { verifyPassword, hashPassword, validatePassword } = await import('../services/authService');

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // Read existing password hash (supports legacy "password" column)
    const rows = await sql<any[]>`
      SELECT password FROM users WHERE id = ${req.user.id}
    `;
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const storedHash = String(rows[0].password || '');
    const ok = await verifyPassword(currentPassword, storedHash);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    const newHash = await hashPassword(newPassword);
    await sql`
      UPDATE users SET password = ${newHash}, updated_at = NOW() WHERE id = ${req.user.id}
    `;

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;


