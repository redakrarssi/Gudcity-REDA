/**
 * Failed Login Tracking Service
 * Handles failed login attempt tracking, account lockout, and security logging
 * following reda.md guidelines by not modifying core authentication services
 */

import sql from '../utils/db';
import SecurityAuditService from './securityAuditService';

export interface FailedLoginAttempt {
  id: number;
  email: string;
  ip_address?: string;
  user_agent?: string;
  attempted_at: string;
  failure_reason: string;
}

export interface AccountLockoutInfo {
  isLocked: boolean;
  remainingTime?: number; // in minutes
  failedAttempts: number;
  maxAttempts: number;
  lockoutExpiresAt?: string;
}

export interface LoginSecurityInfo {
  canAttemptLogin: boolean;
  failedAttempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  isAccountLocked: boolean;
  lockoutRemainingMinutes?: number;
  message?: string;
}

export class FailedLoginService {
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;

  /**
   * Record a failed login attempt
   * @param email User email
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param reason Failure reason
   * @returns Current number of failed attempts
   */
  static async recordFailedAttempt(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason: string = 'invalid_credentials'
  ): Promise<number> {
    try {
      // Use the database function to record the failed attempt
      const result = await sql`
        SELECT record_failed_login_attempt(
          ${email},
          ${ipAddress || null}::inet,
          ${userAgent || null},
          ${reason}
        ) as failed_attempts
      `;

      const failedAttempts = result[0]?.failed_attempts || 0;
      
      // Log the failed login attempt to security audit
      await SecurityAuditService.logFailedLogin(
        email,
        reason,
        ipAddress,
        userAgent,
        { attempt: failedAttempts, maxAttempts: this.MAX_ATTEMPTS }
      );

      // Check if account was locked due to this attempt
      if (failedAttempts >= this.MAX_ATTEMPTS) {
        await SecurityAuditService.logAccountLockout(
          email,
          'too_many_failed_attempts',
          this.LOCKOUT_DURATION_MINUTES,
          ipAddress
        );
      }
      
      console.log(`🚫 Failed login recorded for ${email}: ${failedAttempts}/${this.MAX_ATTEMPTS} attempts`);
      
      return failedAttempts;
    } catch (error) {
      console.error('Error recording failed login attempt:', error);
      return 0;
    }
  }

  /**
   * Reset failed login attempts on successful login
   * @param email User email
   */
  static async resetFailedAttempts(email: string): Promise<void> {
    try {
      await sql.query('SELECT reset_failed_login_attempts($1)', [email]);
      
      // Log successful login reset to security audit
      await SecurityAuditService.logSecurityEvent(
        'LOGIN_ATTEMPTS_RESET',
        'authentication',
        email,
        { resetTime: new Date().toISOString() }
      );
      
      console.log(`✅ Failed login attempts reset for ${email}`);
    } catch (error) {
      console.error('Error resetting failed login attempts:', error);
    }
  }

  /**
   * Check if account is locked
   * @param email User email
   * @returns Account lockout information
   */
  static async checkAccountLockout(email: string): Promise<AccountLockoutInfo> {
    try {
      // Check if account is locked
      const lockResult = await sql.query('SELECT is_account_locked($1) as is_locked', [email]);
      const isLocked = lockResult[0]?.is_locked || false;

      // Get failed attempts count
      const userResult = await sql`
        SELECT 
          COALESCE(failed_login_attempts, 0) as failed_attempts,
          account_locked_until
        FROM users 
        WHERE email = ${email}
      `;

      const failedAttempts = userResult[0]?.failed_attempts || 0;
      const lockedUntil = userResult[0]?.account_locked_until;

      let remainingTime: number | undefined;
      if (isLocked && lockedUntil) {
        const lockoutEnd = new Date(lockedUntil);
        const now = new Date();
        remainingTime = Math.max(0, Math.ceil((lockoutEnd.getTime() - now.getTime()) / (1000 * 60)));
      }

      return {
        isLocked,
        remainingTime,
        failedAttempts,
        maxAttempts: this.MAX_ATTEMPTS,
        lockoutExpiresAt: lockedUntil
      };
    } catch (error) {
      console.error('Error checking account lockout:', error);
      return {
        isLocked: false,
        failedAttempts: 0,
        maxAttempts: this.MAX_ATTEMPTS
      };
    }
  }

  /**
   * Get comprehensive login security information for a user
   * @param email User email
   * @returns Login security information including lockout status
   */
  static async getLoginSecurityInfo(email: string): Promise<LoginSecurityInfo> {
    try {
      const lockoutInfo = await this.checkAccountLockout(email);
      
      const canAttemptLogin = !lockoutInfo.isLocked;
      const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - lockoutInfo.failedAttempts);

      let message: string | undefined;
      if (lockoutInfo.isLocked) {
        message = `Account locked. Try again in ${lockoutInfo.remainingTime} minutes.`;
      } else if (lockoutInfo.failedAttempts > 0) {
        message = `${remainingAttempts} attempts remaining before account lockout.`;
      }

      return {
        canAttemptLogin,
        failedAttempts: lockoutInfo.failedAttempts,
        maxAttempts: this.MAX_ATTEMPTS,
        remainingAttempts,
        isAccountLocked: lockoutInfo.isLocked,
        lockoutRemainingMinutes: lockoutInfo.remainingTime,
        message
      };
    } catch (error) {
      console.error('Error getting login security info:', error);
      return {
        canAttemptLogin: true,
        failedAttempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        remainingAttempts: this.MAX_ATTEMPTS,
        isAccountLocked: false
      };
    }
  }

  /**
   * Get recent failed login attempts for security monitoring
   * @param email Optional email filter
   * @param hours Number of hours to look back (default: 24)
   * @returns Array of recent failed login attempts
   */
  static async getRecentFailedAttempts(
    email?: string,
    hours: number = 24
  ): Promise<FailedLoginAttempt[]> {
    try {
      let query = `
        SELECT id, email, ip_address, user_agent, attempted_at, failure_reason
        FROM failed_login_attempts
        WHERE attempted_at >= NOW() - INTERVAL '$$1 hours'
      `;
      const params = [hours];
      
      if (email) {
        query = `
          SELECT id, email, ip_address, user_agent, attempted_at, failure_reason
          FROM failed_login_attempts
          WHERE email = $1 AND attempted_at >= NOW() - INTERVAL '$$2 hours'
        `;
        params.unshift(email);
      }
      
      query += ' ORDER BY attempted_at DESC LIMIT 100';
      
      const result = await sql.query(query, params);

      return result.map(row => ({
        id: row.id,
        email: row.email,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        attempted_at: row.attempted_at,
        failure_reason: row.failure_reason
      }));
    } catch (error) {
      console.error('Error getting recent failed attempts:', error);
      return [];
    }
  }

  /**
   * Get failed login summary for security dashboard
   * @returns Summary of failed login attempts grouped by email
   */
  static async getFailedLoginSummary(): Promise<any[]> {
    try {
      const result = await sql`
        SELECT * FROM failed_login_summary
        LIMIT 50
      `;
      return result;
    } catch (error) {
      console.error('Error getting failed login summary:', error);
      return [];
    }
  }

  /**
   * Manually unlock an account (admin function)
   * @param email User email
   * @returns Success status
   */
  static async unlockAccount(email: string): Promise<boolean> {
    try {
      await sql`
        UPDATE users 
        SET 
          account_locked_until = NULL,
          failed_login_attempts = 0,
          last_failed_login = NULL
        WHERE email = ${email}
      `;
      
      console.log(`🔓 Account manually unlocked for ${email}`);
      return true;
    } catch (error) {
      console.error('Error unlocking account:', error);
      return false;
    }
  }

  /**
   * Get client IP address from request headers
   * @param headers Request headers
   * @returns Client IP address
   */
  static getClientIP(headers: Record<string, string>): string {
    return headers['x-forwarded-for'] || 
           headers['x-real-ip'] || 
           headers['x-client-ip'] || 
           'unknown';
  }

  /**
   * Validate if an email should be allowed to attempt login
   * This is called before authentication to prevent unnecessary processing
   * @param email User email
   * @returns Whether login attempt is allowed
   */
  static async canAttemptLogin(email: string): Promise<{ allowed: boolean; message?: string }> {
    try {
      const securityInfo = await this.getLoginSecurityInfo(email);
      
      if (!securityInfo.canAttemptLogin) {
        return {
          allowed: false,
          message: securityInfo.message || 'Account is temporarily locked'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking login permission:', error);
      // On error, allow the attempt (fail open for availability)
      return { allowed: true };
    }
  }
}

export default FailedLoginService;
