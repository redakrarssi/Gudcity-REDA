import sql from '../_lib/db';
import { randomBytes } from 'crypto';

export interface VerificationToken {
  id: string;
  userId: string;
  token: string;
  type: 'email' | 'phone' | 'password_reset' | 'account_verification';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Server-side service for verification tokens
 * All database operations for verification management
 */
export class VerificationServerService {
  /**
   * Generate verification token
   */
  static async generateVerificationToken(
    userId: string,
    type: VerificationToken['type'],
    expiresInHours: number = 24
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const userIdInt = parseInt(userId);
      
      // Generate a secure random token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      await sql`
        INSERT INTO verification_tokens (
          user_id,
          token,
          type,
          expires_at,
          used,
          created_at
        ) VALUES (
          ${userIdInt},
          ${token},
          ${type},
          ${expiresAt},
          false,
          NOW()
        )
      `;

      return { success: true, token };
    } catch (error) {
      console.error('Error generating verification token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify token
   */
  static async verifyToken(
    token: string,
    type: VerificationToken['type']
  ): Promise<{
    valid: boolean;
    userId?: string;
    reason?: string;
  }> {
    try {
      const result = await sql`
        SELECT 
          id::text,
          user_id::text as "userId",
          token,
          type,
          expires_at as "expiresAt",
          used
        FROM verification_tokens
        WHERE token = ${token}
        AND type = ${type}
      `;

      if (result.length === 0) {
        return { valid: false, reason: 'Token not found' };
      }

      const tokenData = result[0];

      if (tokenData.used) {
        return { valid: false, reason: 'Token already used' };
      }

      if (new Date(tokenData.expiresAt) < new Date()) {
        return { valid: false, reason: 'Token expired' };
      }

      return {
        valid: true,
        userId: tokenData.userId
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return { valid: false, reason: 'Error verifying token' };
    }
  }

  /**
   * Mark token as used
   */
  static async markTokenAsUsed(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sql`
        UPDATE verification_tokens
        SET used = true, updated_at = NOW()
        WHERE token = ${token}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error marking token as used:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete expired tokens
   */
  static async cleanupExpiredTokens(): Promise<{ success: boolean; deleted?: number; error?: string }> {
    try {
      const result = await sql`
        DELETE FROM verification_tokens
        WHERE expires_at < NOW()
        OR (used = true AND created_at < NOW() - INTERVAL '7 days')
        RETURNING id
      `;

      return {
        success: true,
        deleted: result.length
      };
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userIdInt = parseInt(userId);

      await sql`
        UPDATE users
        SET 
          email_verified = true,
          updated_at = NOW()
        WHERE id = ${userIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify phone
   */
  static async verifyPhone(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userIdInt = parseInt(userId);

      await sql`
        UPDATE users
        SET 
          phone_verified = true,
          updated_at = NOW()
        WHERE id = ${userIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error verifying phone:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send verification email
   */
  static async sendVerificationEmail(
    userId: string,
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate token
      const tokenResult = await this.generateVerificationToken(userId, 'email');
      
      if (!tokenResult.success || !tokenResult.token) {
        return { success: false, error: tokenResult.error || 'Failed to generate token' };
      }

      // In a real implementation, this would send an email
      // For now, just log it
      console.log(`Verification email would be sent to ${email} with token: ${tokenResult.token}`);

      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    userId: string,
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate token
      const tokenResult = await this.generateVerificationToken(userId, 'password_reset', 1); // 1 hour expiry
      
      if (!tokenResult.success || !tokenResult.token) {
        return { success: false, error: tokenResult.error || 'Failed to generate token' };
      }

      // In a real implementation, this would send an email
      console.log(`Password reset email would be sent to ${email} with token: ${tokenResult.token}`);

      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

