// Lightweight environment/security validation used by server.ts and npm scripts

export function logSecurityValidation() {
  const isProd = process.env.NODE_ENV === 'production';
  const issues = [];

  const jwt = process.env.VITE_JWT_SECRET || process.env.JWT_SECRET;
  const jwtRefresh = process.env.VITE_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;
  const dbUrl = process.env.DATABASE_URL;

  if (isProd && !jwt) issues.push('JWT secret is missing (VITE_JWT_SECRET)');
  if (isProd && !jwtRefresh) issues.push('JWT refresh secret is missing (VITE_JWT_REFRESH_SECRET)');
  if (!dbUrl) issues.push('DATABASE_URL is not set');

  // Report
  console.log('🔐 Security validation report:');
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- DATABASE_URL: ${dbUrl ? 'set' : 'missing'}`);
  console.log(`- JWT secret: ${jwt ? 'set' : 'missing'}`);
  console.log(`- JWT refresh secret: ${jwtRefresh ? 'set' : 'missing'}`);
  if (issues.length === 0) {
    console.log('✅ No critical issues detected.');
  } else {
    issues.forEach(i => console.error(`❌ ${i}`));
  }
}

export function canStartSafely() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return true;
  const hasJwt = !!(process.env.VITE_JWT_SECRET || process.env.JWT_SECRET);
  const hasJwtRefresh = !!(process.env.VITE_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET);
  const hasDb = !!process.env.DATABASE_URL;
  return hasJwt && hasJwtRefresh && hasDb;
}

export function getSecurityStatus() {
  return {
    env: process.env.NODE_ENV || 'development',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasJwt: !!(process.env.VITE_JWT_SECRET || process.env.JWT_SECRET),
    hasJwtRefresh: !!(process.env.VITE_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET),
  };
}


