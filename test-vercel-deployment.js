/**
 * Vercel Deployment Test Script
 * 
 * This script tests the build process locally to ensure
 * Vercel deployment will succeed.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Vercel deployment locally...\n');

// Test 1: Check if required files exist
console.log('Test 1: Required Files Check');
const requiredFiles = [
  'package.json',
  'vercel.json',
  'vite.config.ts',
  'index.html',
  'src/main.tsx'
];

let missingFiles = 0;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    missingFiles++;
  }
});

if (missingFiles === 0) {
  console.log('✅ All required files present\n');
} else {
  console.log(`❌ ${missingFiles} required files missing\n`);
}

// Test 2: Check package.json scripts
console.log('Test 2: Package.json Scripts Check');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'build:vercel', 'dev'];

let missingScripts = 0;
requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script} script exists`);
  } else {
    console.log(`❌ ${script} script missing`);
    missingScripts++;
  }
});

if (missingScripts === 0) {
  console.log('✅ All required scripts present\n');
} else {
  console.log(`❌ ${missingScripts} required scripts missing\n`);
}

// Test 3: Check vercel.json configuration
console.log('Test 3: Vercel Configuration Check');
if (fs.existsSync('vercel.json')) {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.builds && vercelConfig.builds[0] && vercelConfig.builds[0].config && vercelConfig.builds[0].config.distDir === 'dist') {
    console.log('✅ Vercel build configuration correct');
  } else {
    console.log('❌ Vercel build configuration incorrect');
  }
  
  if (vercelConfig.routes && vercelConfig.routes.length > 0) {
    console.log('✅ Vercel routes configured');
  } else {
    console.log('❌ Vercel routes not configured');
  }
  
  if (vercelConfig.headers && vercelConfig.headers.length > 0) {
    console.log('✅ Security headers configured');
  } else {
    console.log('❌ Security headers not configured');
  }
} else {
  console.log('❌ vercel.json not found');
}

console.log('');

// Test 4: Check environment variables
console.log('Test 4: Environment Variables Check');
const requiredEnvVars = [
  'VITE_JWT_SECRET',
  'VITE_JWT_REFRESH_SECRET',
  'VITE_QR_SECRET_KEY',
  'VITE_QR_ENCRYPTION_KEY'
];

let missingEnvVars = 0;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName} is set`);
  } else {
    console.log(`⚠️  ${varName} not set (will use fallback)`);
    missingEnvVars++;
  }
});

if (missingEnvVars === 0) {
  console.log('✅ All environment variables set\n');
} else {
  console.log(`⚠️  ${missingEnvVars} environment variables not set (using fallbacks)\n`);
}

// Test 5: Test build process
console.log('Test 5: Build Process Test');
try {
  console.log('Running npm run build:vercel...');
  execSync('npm run build:vercel', { stdio: 'inherit' });
  console.log('✅ Build process successful\n');
} catch (error) {
  console.log('❌ Build process failed:', error.message);
  console.log('Please check the error above and fix any issues\n');
}

// Test 6: Check build output
console.log('Test 6: Build Output Check');
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  const buildFiles = fs.readdirSync(distDir);
  console.log(`✅ Build output directory exists with ${buildFiles.length} files`);
  
  const indexFile = path.join(distDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    console.log('✅ index.html generated');
  } else {
    console.log('❌ index.html not found in build output');
  }
  
  const jsFiles = buildFiles.filter(file => file.endsWith('.js'));
  const cssFiles = buildFiles.filter(file => file.endsWith('.css'));
  
  console.log(`✅ ${jsFiles.length} JavaScript files generated`);
  console.log(`✅ ${cssFiles.length} CSS files generated`);
} else {
  console.log('❌ Build output directory not found');
}

console.log('');

// Summary
console.log('='.repeat(50));
console.log('📊 Vercel Deployment Test Summary');
console.log('='.repeat(50));

const tests = [
  { name: 'Required Files', passed: missingFiles === 0 },
  { name: 'Package Scripts', passed: missingScripts === 0 },
  { name: 'Vercel Config', passed: fs.existsSync('vercel.json') },
  { name: 'Environment Variables', passed: missingEnvVars === 0 },
  { name: 'Build Process', passed: fs.existsSync(distDir) },
  { name: 'Build Output', passed: fs.existsSync(path.join(distDir, 'index.html')) }
];

const passedTests = tests.filter(test => test.passed).length;
const totalTests = tests.length;

tests.forEach(test => {
  const status = test.passed ? '✅' : '❌';
  console.log(`${status} ${test.name}`);
});

console.log(`\n🎯 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Your project is ready for Vercel deployment.');
  console.log('\n📋 Next Steps:');
  console.log('1. Set up your Vercel account');
  console.log('2. Connect your GitHub repository');
  console.log('3. Configure environment variables in Vercel dashboard');
  console.log('4. Deploy your project');
  console.log('5. Test your deployed application');
} else {
  console.log('⚠️  Some tests failed. Please fix the issues above before deploying.');
  console.log('\n🔧 Common Fixes:');
  console.log('- Ensure all required files are present');
  console.log('- Check package.json scripts');
  console.log('- Verify vercel.json configuration');
  console.log('- Set up environment variables');
  console.log('- Fix any build errors');
}

console.log('\n📚 For detailed deployment instructions, see VERCEL_DEPLOYMENT_GUIDE.md');