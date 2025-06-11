import sql from '../utils/db';
import env from '../utils/env';
import { withTransaction } from '../utils/errorHandler';
import { getUserByEmail, updateUser } from './userService';
import * as cryptoUtils from '../utils/cryptoUtils';

// Interface for verification tokens
export interface VerificationToken {
  id: number;
  user_id: number;
  token: string;
  type: VerificationTokenType;
  expires_at: Date;
  created_at: Date;
  used_at?: Date;
  used: boolean;
}

// Types of verification tokens
export enum VerificationTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_RECOVERY = 'account_recovery',
  TWO_FACTOR_AUTH = 'two_factor_auth'
}

/**
 * Ensure the verification tokens table exists
 */
export async function ensureVerificationTokensTableExists(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(100) NOT NULL,
        type VARCHAR(30) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP WITH TIME ZONE,
        used BOOLEAN DEFAULT FALSE,
        UNIQUE (user_id, token)
      )
    `;
    
    // Create index for token lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token)
    `;
    
    // Create index for user lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id)
    `;
  } catch (error) {
    console.error('Error creating verification tokens table:', error);
    throw error;
  }
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return cryptoUtils.generateRandomBytes(length);
}

/**
 * Create a verification token for a user
 */
export async function createVerificationToken(
  userId: number,
  type: VerificationTokenType,
  expiresInHours: number = 24
): Promise<string> {
  return withTransaction(async () => {
    try {
      // Generate a secure random token
      const token = generateToken();
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Insert the token into the database
      await sql`
        INSERT INTO verification_tokens (
          user_id,
          token,
          type,
          expires_at
        ) VALUES (
          ${userId},
          ${token},
          ${type},
          ${expiresAt}
        )
      `;
      
      return token;
    } catch (error) {
      console.error('Error creating verification token:', error);
      throw error;
    }
  });
}

/**
 * Verify a token and mark it as used
 */
export async function verifyToken(
  token: string,
  type: VerificationTokenType
): Promise<VerificationToken | null> {
  return withTransaction(async () => {
    try {
      // Find the token
      const result = await sql`
        SELECT * FROM verification_tokens
        WHERE token = ${token}
        AND type = ${type}
        AND used = FALSE
        AND expires_at > NOW()
      `;
      
      if (!result || result.length === 0) {
        return null;
      }
      
      const verificationToken = result[0] as VerificationToken;
      
      // Mark the token as used
      await sql`
        UPDATE verification_tokens
        SET used = TRUE, used_at = NOW()
        WHERE id = ${verificationToken.id}
      `;
      
      return verificationToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  });
}

/**
 * Start the email verification process for a user
 */
export async function startEmailVerification(userId: number, email: string): Promise<string> {
  try {
    // Create a verification token
    const token = await createVerificationToken(
      userId,
      VerificationTokenType.EMAIL_VERIFICATION,
      24 // Token expires in 24 hours
    );
    
    // Send verification email (this would integrate with an email service)
    await sendVerificationEmail(email, token);
    
    return token;
  } catch (error) {
    console.error('Error starting email verification:', error);
    throw error;
  }
}

/**
 * Complete the email verification process
 */
export async function completeEmailVerification(token: string): Promise<boolean> {
  return withTransaction(async () => {
    try {
      // Verify the token
      const verificationToken = await verifyToken(
        token,
        VerificationTokenType.EMAIL_VERIFICATION
      );
      
      if (!verificationToken) {
        return false;
      }
      
      // Update the user's email verification status
      await sql`
        UPDATE users
        SET email_verified = TRUE, 
            email_verified_at = NOW()
        WHERE id = ${verificationToken.user_id}
      `;
      
      return true;
    } catch (error) {
      console.error('Error completing email verification:', error);
      throw error;
    }
  });
}

/**
 * Start the password reset process
 */
export async function startPasswordReset(email: string): Promise<string | null> {
  try {
    // Find the user
    const user = await getUserByEmail(email);
    
    if (!user || !user.id) {
      return null;
    }
    
    // Create a verification token
    const token = await createVerificationToken(
      user.id,
      VerificationTokenType.PASSWORD_RESET,
      1 // Token expires in 1 hour
    );
    
    // Send password reset email
    await sendPasswordResetEmail(email, token);
    
    return token;
  } catch (error) {
    console.error('Error starting password reset:', error);
    throw error;
  }
}

/**
 * Complete the password reset process
 */
export async function completePasswordReset(token: string, newPassword: string): Promise<boolean> {
  return withTransaction(async () => {
    try {
      // Verify the token
      const verificationToken = await verifyToken(
        token,
        VerificationTokenType.PASSWORD_RESET
      );
      
      if (!verificationToken) {
        return false;
      }
      
      // Update the user's password
      await updateUser(verificationToken.user_id, { password: newPassword });
      
      return true;
    } catch (error) {
      console.error('Error completing password reset:', error);
      throw error;
    }
  });
}

/**
 * Send a verification email
 * Note: This is a placeholder. In a real application, this would use an email service.
 */
async function sendVerificationEmail(email: string, token: string): Promise<void> {
  try {
    // In development, just log the verification link
    if (env.isDevelopment()) {
      console.log(`
        Email Verification Link (DEVELOPMENT ONLY)
        -------------------------------------------
        To: ${email}
        Verification Link: ${env.APP_URL}/verify-email?token=${token}
        -------------------------------------------
      `);
      return;
    }
    
    // In production, this would integrate with an email service like SendGrid, Mailgun, etc.
    console.log(`Email verification requested for ${email} with token ${token}`);
    
    // Actual email sending code would go here
    // For example, using nodemailer or a dedicated email service API
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

/**
 * Send a password reset email
 * Note: This is a placeholder. In a real application, this would use an email service.
 */
async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  try {
    // In development, just log the reset link
    if (env.isDevelopment()) {
      console.log(`
        Password Reset Link (DEVELOPMENT ONLY)
        -------------------------------------------
        To: ${email}
        Reset Link: ${env.APP_URL}/reset-password?token=${token}
        -------------------------------------------
      `);
      return;
    }
    
    // In production, this would integrate with an email service
    console.log(`Password reset requested for ${email} with token ${token}`);
    
    // Actual email sending code would go here
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Initialize the verification system
ensureVerificationTokensTableExists().catch(error => {
  console.error('Failed to initialize verification system:', error);
});

export default {
  startEmailVerification,
  completeEmailVerification,
  startPasswordReset,
  completePasswordReset,
  createVerificationToken,
  verifyToken,
  generateToken,
  VerificationTokenType
}; 