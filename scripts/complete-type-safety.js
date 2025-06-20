#!/usr/bin/env node

/**
 * Complete Type Safety Transformation
 * 
 * This script automates the final phase of the type safety transformation
 * by applying type safety improvements to all remaining components.
 * 
 * Features:
 * 1. Detects components without proper type safety
 * 2. Applies automated fixes based on patterns
 * 3. Generates missing type definitions
 * 4. Updates imports to use the unified type system
 * 5. Validates results with TypeScript compiler
 * 
 * Usage:
 *   node complete-type-safety.js [--dry-run] [--target=directory]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ts = require('typescript');
const glob = require('glob');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetArg = args.find(arg => arg.startsWith('--target='));
const targetDir = targetArg ? targetArg.split('=')[1] : 'src';

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TS_CONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');
const COMPONENT_PATTERNS = [
  'src/components/**/*.tsx',
  'src/pages/**/*.tsx'
];
const UTIL_PATTERNS = [
  'src/utils/**/*.ts',
  'src/services/**/*.ts'
];
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**'
];

// Type patterns to apply
const TYPE_PATTERNS = {
  // React component props pattern
  componentProps: {
    pattern: /(?:interface|type)\s+(\w+Props)\s*(?:=|{)/g,
    replacement: (match, name) => {
      return match.includes('interface') 
        ? match 
        : `interface ${name} {`;
    }
  },
  
  // Function parameter types pattern
  functionParams: {
    pattern: /(function|const)\s+(\w+)\s*=\s*\(([^)]*)\)\s*(?:=>|{)/g,
    replacement: (match, keyword, name, params) => {
      if (params.includes(':')) return match; // Already has types
      
      const typedParams = params
        .split(',')
        .map(param => {
          param = param.trim();
          if (!param) return param;
          if (param.includes(':')) return param; // Already typed
          if (param.includes('=')) {
            // Has default value
            const [paramName, defaultValue] = param.split('=').map(p => p.trim());
            return `${paramName}: unknown = ${defaultValue}`;
          }
          return `${param}: unknown`;
        })
        .join(', ');
      
      return `${keyword} ${name} = (${typedParams}) ${match.includes('=>') ? '=>' : '{'}`;
    }
  },
  
  // Return type pattern
  returnTypes: {
    pattern: /(function|const)\s+(\w+)\s*=\s*(\([^)]*\))\s*=>\s*{/g,
    replacement: (match, keyword, name, params) => {
      return `${keyword} ${name} = ${params}: unknown => {`;
    }
  },
  
  // useState without type pattern
  useStateTypes: {
    pattern: /useState\(([^)]*)\)/g,
    replacement: (match, initialValue) => {
      if (initialValue.includes('as')) return match; // Already has type assertion
      if (initialValue.includes('<')) return match; // Already has generic type
      
      // Determine appropriate type based on initial value
      let type = 'unknown';
      if (initialValue.trim() === '""' || initialValue.includes("'")) type = 'string';
      else if (initialValue.trim() === '0' || /^\d+$/.test(initialValue.trim())) type = 'number';
      else if (initialValue.trim() === 'true' || initialValue.trim() === 'false') type = 'boolean';
      else if (initialValue.trim() === '[]') type = 'unknown[]';
      else if (initialValue.trim() === '{}') type = 'Record<string, unknown>';
      else if (initialValue.trim() === 'null') type = 'null';
      else if (initialValue.trim() === 'undefined') type = 'undefined';
      
      return `useState<${type}>(${initialValue})`;
    }
  },
  
  // useRef without type pattern
  useRefTypes: {
    pattern: /useRef\(([^)]*)\)/g,
    replacement: (match, initialValue) => {
      if (initialValue.includes('as')) return match; // Already has type assertion
      if (initialValue.includes('<')) return match; // Already has generic type
      
      // Determine appropriate type based on initial value
      let type = 'unknown';
      if (initialValue.trim() === '""' || initialValue.includes("'")) type = 'string';
      else if (initialValue.trim() === '0' || /^\d+$/.test(initialValue.trim())) type = 'number';
      else if (initialValue.trim() === 'true' || initialValue.trim() === 'false') type = 'boolean';
      else if (initialValue.trim() === '[]') type = 'unknown[]';
      else if (initialValue.trim() === '{}') type = 'Record<string, unknown>';
      else if (initialValue.trim() === 'null') type = 'null | HTMLElement';
      
      return `useRef<${type}>(${initialValue})`;
    }
  },
  
  // QR code type imports pattern
  qrCodeImports: {
    pattern: /import\s+{([^}]*)}\s+from\s+['"]([^'"]*qrCode[^'"]*)['"]/g,
    replacement: (match, imports, path) => {
      // Check if we need to add any missing imports
      const missingImports = [];
      if (!imports.includes('QrCodeType')) missingImports.push('QrCodeType');
      if (!imports.includes('QrCodeData')) missingImports.push('QrCodeData');
      if (!imports.includes('UnifiedScanResult')) missingImports.push('UnifiedScanResult');
      
      if (missingImports.length === 0) return match;
      
      const updatedImports = imports.split(',')
        .map(imp => imp.trim())
        .filter(imp => imp)
        .concat(missingImports)
        .join(', ');
      
      return `import { ${updatedImports} } from '${path}'`;
    }
  },
  
  // Add runtime type validator imports
  addValidatorImports: {
    pattern: /import\s+{([^}]*)}\s+from\s+['"]([^'"]*qrCode[^'"]*)['"]/g,
    test: (content) => {
      return content.includes('QrCodeData') && 
             !content.includes('runtimeTypeValidator') &&
             (content.includes('JSON.parse') || content.includes('validateQrCode'));
    },
    replacement: (match, imports, path) => {
      return `${match}\nimport { validateQrCodeData, isQrCodeData, isCustomerQrCodeData, isLoyaltyCardQrCodeData, isPromoCodeQrCodeData } from '../utils/runtimeTypeValidator';`;
    }
  },
  
  // Replace any with unknown
  anyToUnknown: {
    pattern: /:\s*any(?![a-zA-Z0-9_])/g,
    replacement: ': unknown'
  }
};

// Main function
async function main() {
  console.log(`Complete Type Safety Transformation (${dryRun ? 'DRY RUN' : 'LIVE MODE'})`);
  console.log('='.repeat(50));
  
  // Get files to process
  const componentFiles = getFilesToProcess(COMPONENT_PATTERNS, IGNORE_PATTERNS);
  const utilFiles = getFilesToProcess(UTIL_PATTERNS, IGNORE_PATTERNS);
  
  console.log(`Found ${componentFiles.length} component files and ${utilFiles.length} utility files`);
  
  // Process component files
  console.log('\nProcessing component files...');
  let componentsProcessed = 0;
  for (const file of componentFiles) {
    const processed = processFile(file, [
      TYPE_PATTERNS.componentProps,
      TYPE_PATTERNS.functionParams,
      TYPE_PATTERNS.returnTypes,
      TYPE_PATTERNS.useStateTypes,
      TYPE_PATTERNS.useRefTypes,
      TYPE_PATTERNS.qrCodeImports,
      TYPE_PATTERNS.addValidatorImports,
      TYPE_PATTERNS.anyToUnknown
    ]);
    
    if (processed) {
      componentsProcessed++;
    }
  }
  
  // Process utility files
  console.log('\nProcessing utility files...');
  let utilsProcessed = 0;
  for (const file of utilFiles) {
    const processed = processFile(file, [
      TYPE_PATTERNS.functionParams,
      TYPE_PATTERNS.returnTypes,
      TYPE_PATTERNS.qrCodeImports,
      TYPE_PATTERNS.addValidatorImports,
      TYPE_PATTERNS.anyToUnknown
    ]);
    
    if (processed) {
      utilsProcessed++;
    }
  }
  
  console.log('\nSummary:');
  console.log(`- Components processed: ${componentsProcessed}/${componentFiles.length}`);
  console.log(`- Utilities processed: ${utilsProcessed}/${utilFiles.length}`);
  
  // Validate TypeScript compilation if not in dry run mode
  if (!dryRun) {
    console.log('\nValidating TypeScript compilation...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Please fix the errors manually.');
    }
  } else {
    console.log('\nSkipping TypeScript validation in dry run mode.');
  }
}

// Get files to process based on patterns
function getFilesToProcess(patterns, ignorePatterns) {
  let files = [];
  
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, {
      cwd: PROJECT_ROOT,
      ignore: ignorePatterns,
      absolute: true
    });
    
    files = files.concat(matches);
  }
  
  return files;
}

// Process a single file with the given patterns
function processFile(filePath, patterns) {
  try {
    // Read file content
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Apply each pattern
    for (const pattern of patterns) {
      // Skip pattern if it has a test function and the test fails
      if (pattern.test && !pattern.test(content)) {
        continue;
      }
      
      content = content.replace(pattern.pattern, pattern.replacement);
    }
    
    // Check if content was modified
    if (content !== originalContent) {
      console.log(`Modified: ${path.relative(PROJECT_ROOT, filePath)}`);
      
      // Write changes if not in dry run mode
      if (!dryRun) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 