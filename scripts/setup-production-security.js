#!/usr/bin/env node
/**
 * Production Security Setup Script
 * Sets up complete production security configuration
 */

const fs = require('fs');
const path = require('path');
const { generateProductionSecrets } = require('./generate-secure-secrets');

/**
 * Generate production database URLs with security settings
 */
function generateSecureDatabaseURLs() {
  const templates = {
    postgresql: {
      client: 'postgresql://username:password@host:5432/database?sslmode=require&pool_max=20&pool_timeout=10&connect_timeout=60',
      server: 'postgresql://username:password@host:5432/database?sslmode=require&pool_max=50&pool_timeout=30&connect_timeout=120'
    },
    mysql: {
      client: 'mysql://username:password@host:3306/database?ssl=true&pool_limit=20&timeout=60000',
      server: 'mysql://username:password@host:3306/database?ssl=true&pool_limit=50&timeout=120000'
    }
  };

  return templates;
}

/**
 * Create production security configuration
 */
function createProductionSecurityConfig() {
  const secrets = generateProductionSecrets();
  const dbTemplates = generateSecureDatabaseURLs();
  
  const secureEnvContent = `# =========================================================================
# SECURE PRODUCTION ENVIRONMENT - AUTO-GENERATED
# =========================================================================
# Generated on: ${new Date().toISOString()}
# DO NOT COMMIT THIS FILE TO VERSION CONTROL!

# =========================================================================
# DATABASE CONFIGURATION (SERVER-ONLY)
# =========================================================================
# PostgreSQL with SSL and connection pooling
DATABASE_URL=${dbTemplates.postgresql.client}
SERVER_DATABASE_URL=${dbTemplates.postgresql.server}

# =========================================================================
# GENERATED 64-CHARACTER SECRETS
# =========================================================================
JWT_SECRET=${secrets.jwtSecret}
JWT_REFRESH_SECRET=${secrets.jwtRefreshSecret}
QR_SECRET_KEY=${secrets.qrSecretKey}
QR_ENCRYPTION_KEY=${secrets.qrEncryptionKey}
CSRF_SECRET=${secrets.csrfSecret}
SESSION_SECRET=${secrets.sessionSecret}

# =========================================================================
# PRODUCTION SECURITY SETTINGS
# =========================================================================
NODE_ENV=production
VITE_APP_ENV=production

# Security features enabled
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
SSL_ENABLED=true
FORCE_HTTPS=true
SECURE_COOKIES=true

# CORS (replace with your production domains)
CORS_ORIGINS=https://app.gudcity.com,https://gudcity.com
VITE_CORS_ORIGINS=https://app.gudcity.com,https://gudcity.com

# Strict rate limiting
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=900000

# Production URLs (replace with your domains)
VITE_API_URL=https://api.gudcity.com
FRONTEND_URL=https://app.gudcity.com
APP_URL=https://app.gudcity.com

# Debug and mock features disabled
VITE_DEBUG=false
VITE_MOCK_AUTH=false
VITE_MOCK_DATA=false
VITE_SHOW_MOCK_NOTICE=false

# Security monitoring enabled
SECURITY_LOGGING_ENABLED=true
AUDIT_LOGGING_ENABLED=true
SUSPICIOUS_ACTIVITY_ALERTS=true

# QR encryption enabled
QR_ENCRYPTION_ENABLED=true
VITE_QR_ENCRYPTION_ENABLED=true

# Content Security Policy
VITE_CSP_ENABLED=true

# =========================================================================
# PRODUCTION CHECKLIST
# =========================================================================
# [ ] Replace database URLs with your actual credentials
# [ ] Update CORS_ORIGINS with your production domains
# [ ] Update VITE_API_URL and FRONTEND_URL
# [ ] Verify SSL certificates are configured
# [ ] Test all authentication flows
# [ ] Enable monitoring and alerting
# [ ] Set up backup and recovery procedures
# [ ] Review and test all security settings`;

  return secureEnvContent;
}

/**
 * Setup production security files
 */
function setupProductionSecurity() {
  console.log('🔧 SETTING UP PRODUCTION SECURITY CONFIGURATION');
  console.log('='.repeat(70));

  try {
    // Create secure environment file
    const secureEnvContent = createProductionSecurityConfig();
    const secureEnvPath = path.join(process.cwd(), '.env.production');
    
    fs.writeFileSync(secureEnvPath, secureEnvContent);
    console.log(`✅ Created secure environment file: ${secureEnvPath}`);

    // Create security validation script
    const validationScriptPath = path.join(process.cwd(), 'scripts', 'validate-security.js');
    if (!fs.existsSync(path.dirname(validationScriptPath))) {
      fs.mkdirSync(path.dirname(validationScriptPath), { recursive: true });
    }

    const validationScript = `#!/usr/bin/env node
/**
 * Security Validation Script
 * Run this before deploying to production
 */

const { displaySecurityReport } = require('../src/utils/productionSecurityValidator');

console.log('🔒 RUNNING PRODUCTION SECURITY VALIDATION...');
console.log('');

displaySecurityReport();

console.log('');
console.log('📋 RUN THIS SCRIPT BEFORE EACH PRODUCTION DEPLOYMENT');
`;

    fs.writeFileSync(validationScriptPath, validationScript);
    fs.chmodSync(validationScriptPath, '755');
    console.log(`✅ Created security validation script: ${validationScriptPath}`);

    // Create gitignore entries
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreEntries = `
# Production environment files (NEVER commit these!)
.env.production
.env.secure
.env.local
*.env.backup

# Security keys and certificates
*.key
*.pem
*.crt
*.p12
secrets/
`;

    if (fs.existsSync(gitignorePath)) {
      const existingGitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (!existingGitignore.includes('.env.production')) {
        fs.appendFileSync(gitignorePath, gitignoreEntries);
        console.log('✅ Updated .gitignore with security file exclusions');
      }
    } else {
      fs.writeFileSync(gitignorePath, gitignoreEntries);
      console.log('✅ Created .gitignore with security file exclusions');
    }

    console.log('\n🎉 PRODUCTION SECURITY SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Update database URLs in .env.production with your credentials');
    console.log('2. Update CORS_ORIGINS with your production domains');
    console.log('3. Update API and frontend URLs');
    console.log('4. Run: npm run validate-security');
    console.log('5. Test all functionality in staging environment');
    console.log('6. Deploy to production with secure environment variables');
    
    console.log('\n⚠️  SECURITY REMINDERS:');
    console.log('• NEVER commit .env.production to version control');
    console.log('• Store production secrets in secure key management system');
    console.log('• Rotate secrets regularly');
    console.log('• Monitor security logs and alerts');
    console.log('• Keep backups of environment configuration');

  } catch (error) {
    console.error('❌ Error setting up production security:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupProductionSecurity();
}

module.exports = { setupProductionSecurity, createProductionSecurityConfig };