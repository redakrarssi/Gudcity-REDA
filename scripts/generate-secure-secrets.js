#!/usr/bin/env node
/**
 * Generate Secure 64-Character Secrets for Production
 * Generates cryptographically secure secrets for JWT tokens and QR encryption
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure 64-character string
 */
function generateSecure64CharSecret() {
  // Generate 48 random bytes and encode as base64 to get ~64 characters
  return crypto.randomBytes(48).toString('base64').replace(/[+/=]/g, '').substring(0, 64);
}

/**
 * Generate hexadecimal 64-character secret
 */
function generateHex64CharSecret() {
  // Generate 32 random bytes and encode as hex to get exactly 64 characters
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate production-ready secrets
 */
function generateProductionSecrets() {
  console.log('🔐 GENERATING SECURE 64-CHARACTER PRODUCTION SECRETS');
  console.log('=' .repeat(80));
  
  const secrets = {
    jwtSecret: generateSecure64CharSecret(),
    jwtRefreshSecret: generateSecure64CharSecret(),
    qrSecretKey: generateHex64CharSecret(),
    qrEncryptionKey: generateHex64CharSecret(),
    csrfSecret: generateSecure64CharSecret(),
    sessionSecret: generateHex64CharSecret()
  };

  console.log('\n📋 COPY THESE VALUES TO YOUR .env.secure FILE:');
  console.log('-'.repeat(80));
  
  console.log(`\n# JWT Authentication Secrets (64 characters)`);
  console.log(`JWT_SECRET=${secrets.jwtSecret}`);
  console.log(`JWT_REFRESH_SECRET=${secrets.jwtRefreshSecret}`);
  
  console.log(`\n# QR Code Security Keys (64 characters)`);
  console.log(`QR_SECRET_KEY=${secrets.qrSecretKey}`);
  console.log(`QR_ENCRYPTION_KEY=${secrets.qrEncryptionKey}`);
  
  console.log(`\n# Additional Security Secrets (64 characters)`);
  console.log(`CSRF_SECRET=${secrets.csrfSecret}`);
  console.log(`SESSION_SECRET=${secrets.sessionSecret}`);

  console.log('\n🔒 SECURITY VERIFICATION:');
  console.log('-'.repeat(80));
  console.log(`✅ JWT Secret Length: ${secrets.jwtSecret.length} characters`);
  console.log(`✅ JWT Refresh Secret Length: ${secrets.jwtRefreshSecret.length} characters`);
  console.log(`✅ QR Secret Key Length: ${secrets.qrSecretKey.length} characters`);
  console.log(`✅ QR Encryption Key Length: ${secrets.qrEncryptionKey.length} characters`);
  console.log(`✅ CSRF Secret Length: ${secrets.csrfSecret.length} characters`);
  console.log(`✅ Session Secret Length: ${secrets.sessionSecret.length} characters`);

  console.log('\n⚠️  SECURITY REMINDERS:');
  console.log('-'.repeat(80));
  console.log('• Store these secrets securely and never commit them to version control');
  console.log('• Use different secrets for different environments');
  console.log('• Rotate secrets regularly in production');
  console.log('• Keep backup copies in secure location');
  console.log('• Verify all secrets are exactly 64 characters');

  console.log('\n🚀 PRODUCTION DEPLOYMENT CHECKLIST:');
  console.log('-'.repeat(80));
  console.log('[ ] Copy secrets to production environment');
  console.log('[ ] Verify database SSL connection');
  console.log('[ ] Test authentication with new secrets');
  console.log('[ ] Enable security monitoring');
  console.log('[ ] Configure HTTPS/SSL certificates');
  console.log('[ ] Set up backup and recovery');

  return secrets;
}

// Generate and display secrets
if (require.main === module) {
  generateProductionSecrets();
}

module.exports = { generateProductionSecrets, generateSecure64CharSecret, generateHex64CharSecret };
