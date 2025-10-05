/**
 * Token Blacklist Service
 * 
 * Handles secure token revocation and blacklisting to prevent
 * authentication bypass vulnerabilities.
 */

import sql from '../utils/db';
import crypto from 'crypto';

export interface TokenBlacklistEntry {
  tokenJti: string;
  userId: number;
  expiresAt: Date;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Add a token to the blacklist
 */
export async function blacklistToken(entry: TokenBlacklistEntry): Promise<boolean> {
  try {
    await sql`
      INSERT INTO revoked_tokens (
        token_jti, user_id, expires_at, reason, ip_address, user_agent
      ) VALUES (
        ${entry.tokenJti}, ${entry.userId}, ${entry.expiresAt}, 
        ${entry.reason}, ${entry.ipAddress || null}, ${entry.userAgent || null}
      )
    `;
    
    console.log(`✅ Token blacklisted: ${entry.tokenJti} (${entry.reason})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to blacklist token:', error);
    return false;
  }
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(tokenJti: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM revoked_tokens 
      WHERE token_jti = ${tokenJti} 
      AND expires_at > NOW()
      LIMIT 1
    `;
    
    return result.length > 0;
  } catch (error) {
    console.error('❌ Failed to check token blacklist:', error);
    return false; // Fail open for availability
  }
}

/**
 * Revoke all tokens for a user (e.g., on password change)
 */
export async function revokeAllUserTokens(
  userId: number, 
  reason: string = 'user_action',
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    // Get all active tokens for the user (this would need to be implemented
    // based on your token storage mechanism)
    const activeTokens = await sql`
      SELECT token_jti, expires_at FROM active_sessions
      WHERE user_id = ${userId}
      AND expires_at > NOW()
    `;
    
    // Blacklist all active tokens
    for (const token of activeTokens) {
      await blacklistToken({
        tokenJti: token.token_jti,
        userId: userId,
        expiresAt: new Date(token.expires_at),
        reason: reason,
        ipAddress: ipAddress,
        userAgent: userAgent
      });
    }
    
    // Clear active sessions
    await sql`DELETE FROM active_sessions WHERE user_id = ${userId}`;
    
    console.log(`✅ All tokens revoked for user ${userId} (${reason})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to revoke user tokens:', error);
    return false;
  }
}

/**
 * Revoke a specific token
 */
export async function revokeToken(
  tokenJti: string,
  userId: number,
  reason: string = 'manual_revocation',
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    // Get token expiration from active sessions
    const tokenInfo = await sql`
      SELECT expires_at FROM active_sessions
      WHERE token_jti = ${tokenJti}
      AND user_id = ${userId}
    `;
    
    if (tokenInfo.length === 0) {
      console.warn(`⚠️ Token not found in active sessions: ${tokenJti}`);
      return false;
    }
    
    const expiresAt = new Date(tokenInfo[0].expires_at);
    
    // Add to blacklist
    await blacklistToken({
      tokenJti: tokenJti,
      userId: userId,
      expiresAt: expiresAt,
      reason: reason,
      ipAddress: ipAddress,
      userAgent: userAgent
    });
    
    // Remove from active sessions
    await sql`
      DELETE FROM active_sessions 
      WHERE token_jti = ${tokenJti} 
      AND user_id = ${userId}
    `;
    
    console.log(`✅ Token revoked: ${tokenJti} (${reason})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to revoke token:', error);
    return false;
  }
}

/**
 * Clean up expired blacklist entries
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM revoked_tokens 
      WHERE expires_at < NOW()
    `;
    
    const deletedCount = result.length;
    console.log(`🧹 Cleaned up ${deletedCount} expired blacklist entries`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Failed to cleanup expired tokens:', error);
    return 0;
  }
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStats(): Promise<{
  totalRevoked: number;
  recentRevocations: number;
  topReasons: Array<{ reason: string; count: number }>;
}> {
  try {
    const [totalResult, recentResult, reasonsResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM revoked_tokens`,
      sql`SELECT COUNT(*) as count FROM revoked_tokens WHERE revoked_at > NOW() - INTERVAL '24 hours'`,
      sql`
        SELECT reason, COUNT(*) as count 
        FROM revoked_tokens 
        WHERE revoked_at > NOW() - INTERVAL '7 days'
        GROUP BY reason 
        ORDER BY count DESC 
        LIMIT 5
      `
    ]);
    
    return {
      totalRevoked: totalResult[0]?.count || 0,
      recentRevocations: recentResult[0]?.count || 0,
      topReasons: reasonsResult.map(r => ({ reason: r.reason, count: r.count }))
    };
  } catch (error) {
    console.error('❌ Failed to get blacklist stats:', error);
    return { totalRevoked: 0, recentRevocations: 0, topReasons: [] };
  }
}

/**
 * Generate a unique JWT ID for token tracking
 */
export function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Schedule periodic cleanup of expired tokens
 */
export function scheduleTokenCleanup(): void {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      await cleanupExpiredTokens();
    } catch (error) {
      console.error('❌ Scheduled token cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('🕐 Token cleanup scheduled (every hour)');
}
