/**
 * Environment Diagnostic Utility
 * Helps diagnose environment configuration issues in production vs development
 */

interface EnvironmentDiagnostic {
  environment: 'development' | 'production' | 'preview';
  apiConfiguration: {
    baseUrl: string;
    explicitUrl: string | undefined;
    origin: string | undefined;
    finalUrl: string;
  };
  environmentVariables: {
    present: string[];
    missing: string[];
    recommendations: string[];
  };
  deployment: {
    isVercel: boolean;
    vercelUrl: string | undefined;
    customDomain: boolean;
  };
}

export function diagnoseEnvironment(): EnvironmentDiagnostic {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
  
  // Determine environment
  let environment: 'development' | 'production' | 'preview' = 'development';
  if (isProd) {
    environment = 'production';
  } else if (import.meta.env.MODE === 'preview') {
    environment = 'preview';
  }

  // API Configuration Analysis
  const explicitUrl = import.meta.env.VITE_API_URL;
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  
  let baseUrl = '';
  if (explicitUrl && explicitUrl.trim()) {
    baseUrl = explicitUrl.replace(/\/$/, '');
  } else if (!isDev && origin) {
    baseUrl = origin;
  }
  
  const finalUrl = `${baseUrl}/api/auth/login`;

  // Environment Variables Check
  const requiredEnvVars = [
    'VITE_API_URL',
    'VITE_APP_URL',
    'VITE_APP_ENV',
  ];

  const optionalEnvVars = [
    'VITE_DEBUG',
    'VITE_MOCK_AUTH',
    'VITE_MOCK_DATA',
  ];

  const allEnvVars = [...requiredEnvVars, ...optionalEnvVars];
  const present = allEnvVars.filter(key => {
    const value = (import.meta.env as any)[key];
    return value !== undefined && value !== '';
  });
  
  const missing = requiredEnvVars.filter(key => {
    const value = (import.meta.env as any)[key];
    return value === undefined || value === '';
  });

  // Recommendations
  const recommendations: string[] = [];
  
  // CRITICAL: Check for double /api/ prefix issue
  if (explicitUrl && (explicitUrl === '/api' || explicitUrl.endsWith('/api'))) {
    recommendations.push('⚠️ CRITICAL: VITE_API_URL is set to "/api" but endpoints already include /api/ prefix. This will cause double /api/api/ URLs! Set VITE_API_URL to empty string or remove it entirely.');
  }
  
  if (environment === 'production' && explicitUrl && !explicitUrl.startsWith('http')) {
    recommendations.push('VITE_API_URL should be a full domain (https://...) or empty, not a path like "/api"');
  }
  
  if (missing.length > 0) {
    recommendations.push(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (environment === 'production' && !import.meta.env.VITE_APP_URL) {
    recommendations.push('Set VITE_APP_URL to your production domain in Vercel environment variables');
  }

  // Deployment Analysis
  const isVercel = origin?.includes('.vercel.app') || false;
  const vercelUrl = isVercel ? origin : undefined;
  const customDomain = !isVercel && environment === 'production';

  return {
    environment,
    apiConfiguration: {
      baseUrl,
      explicitUrl,
      origin,
      finalUrl,
    },
    environmentVariables: {
      present,
      missing,
      recommendations,
    },
    deployment: {
      isVercel,
      vercelUrl,
      customDomain,
    },
  };
}

export function logEnvironmentDiagnostic(): void {
  const diagnostic = diagnoseEnvironment();
  
  console.group('🔍 Environment Diagnostic');
  
  console.log('📊 Environment:', diagnostic.environment);
  
  console.group('🌐 API Configuration');
  console.log('Base URL:', diagnostic.apiConfiguration.baseUrl);
  console.log('Explicit URL (VITE_API_URL):', diagnostic.apiConfiguration.explicitUrl || 'Not set');
  console.log('Origin:', diagnostic.apiConfiguration.origin || 'Not available');
  console.log('Final Login URL:', diagnostic.apiConfiguration.finalUrl);
  console.groupEnd();
  
  console.group('⚙️ Environment Variables');
  console.log('✅ Present:', diagnostic.environmentVariables.present);
  if (diagnostic.environmentVariables.missing.length > 0) {
    console.warn('❌ Missing:', diagnostic.environmentVariables.missing);
  }
  if (diagnostic.environmentVariables.recommendations.length > 0) {
    console.group('💡 Recommendations');
    diagnostic.environmentVariables.recommendations.forEach(rec => 
      console.warn('⚠️', rec)
    );
    console.groupEnd();
  }
  console.groupEnd();
  
  console.group('🚀 Deployment');
  console.log('Is Vercel:', diagnostic.deployment.isVercel);
  console.log('Vercel URL:', diagnostic.deployment.vercelUrl || 'Not detected');
  console.log('Custom Domain:', diagnostic.deployment.customDomain);
  console.groupEnd();
  
  console.groupEnd();
}

// Auto-run diagnostic in development or when debug is enabled
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') {
  logEnvironmentDiagnostic();
}

export default diagnoseEnvironment;
