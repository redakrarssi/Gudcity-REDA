#!/usr/bin/env node

/**
 * This script analyzes circular dependencies within your application's bundled code
 * specifically focusing on lodash-related issues that might cause
 * "Cannot access '_' before initialization" errors
 */

const fs = require('fs');
const path = require('path');
const madge = require('madge'); // You'll need to install this: npm install madge
const chalk = require('chalk'); // You'll need to install this: npm install chalk

// Configuration
const DIST_DIR = './dist'; // Your build output directory
const MAIN_VENDOR_FILE = path.join(DIST_DIR, 'vendor-charts-*.js'); // The problematic vendor file

async function analyzeCircularDependencies() {
  console.log(chalk.blue('Analyzing circular dependencies in your project...'));
  
  try {
    // Find all JS files in dist directory
    const files = await findJsFiles(DIST_DIR);
    console.log(chalk.gray(`Found ${files.length} JavaScript files to analyze`));
    
    // Get all vendor files that might be related to charts
    const vendorChartFiles = files.filter(file => {
      return file.includes('vendor') && 
             (file.includes('chart') || file.includes('lodash'));
    });
    
    if (vendorChartFiles.length === 0) {
      console.log(chalk.yellow('No vendor chart files found. Check your build output directory.'));
      return;
    }
    
    console.log(chalk.gray('Found potential chart vendor files:'));
    vendorChartFiles.forEach(file => console.log(chalk.gray(`- ${file}`));
    
    // Look for lodash references
    console.log(chalk.blue('\nLooking for lodash references in vendor files...'));
    
    for (const file of vendorChartFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Find all references to '_'
      const underscoreReferences = findUnderscoreReferences(content);
      
      if (underscoreReferences.length > 0) {
        console.log(chalk.green(`\nFound ${underscoreReferences.length} references to '_' in ${path.basename(file)}:`));
        
        // Group by type of reference
        const typesOfReferences = {
          declarations: [],
          accesses: []
        };
        
        underscoreReferences.forEach(ref => {
          if (ref.type === 'declaration') {
            typesOfReferences.declarations.push(ref);
          } else {
            typesOfReferences.accesses.push(ref);
          }
        });
        
        // Check if we have accesses before declarations (TDZ violation)
        if (typesOfReferences.declarations.length > 0 && 
            typesOfReferences.accesses.length > 0) {
          
          const firstDeclaration = typesOfReferences.declarations.sort((a, b) => a.index - b.index)[0];
          const firstAccess = typesOfReferences.accesses.sort((a, b) => a.index - b.index)[0];
          
          if (firstAccess.index < firstDeclaration.index) {
            console.log(chalk.red('\n⚠️ FOUND POTENTIAL ISSUE: Accessing _ before declaration!'));
            console.log(chalk.red(`  First access at position ${firstAccess.index}:`));
            console.log(chalk.gray(`  ${firstAccess.context}`));
            console.log(chalk.red(`  First declaration at position ${firstDeclaration.index}:`));
            console.log(chalk.gray(`  ${firstDeclaration.context}`));
            
            console.log(chalk.yellow('\nRecommended solution:'));
            console.log('1. Add a pre-lodash script to your HTML:');
            console.log(chalk.cyan('   <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>'));
            console.log('2. Or add this to your entry point JS:');
            console.log(chalk.cyan('   window._ = window._ || {};'));
          } else {
            console.log(chalk.green('✅ No TDZ violation found in this file.'));
          }
        }
      } else {
        console.log(chalk.gray(`No lodash references found in ${path.basename(file)}`));
      }
    }
    
    // Run madge to analyze circular dependencies
    console.log(chalk.blue('\nAnalyzing circular dependencies in your source code...'));
    const srcDir = './src'; // Your source directory
    
    if (!fs.existsSync(srcDir)) {
      console.log(chalk.yellow('Source directory not found. Skipping circular dependency analysis.'));
      return;
    }
    
    const results = await madge(srcDir, {
      detectiveOptions: {
        es6: {
          mixedImports: true
        }
      }
    });
    
    const circular = results.circular();
    if (circular.length > 0) {
      console.log(chalk.red(`\n⚠️ Found ${circular.length} circular dependencies in your code:`));
      circular.forEach((path, i) => {
        console.log(chalk.yellow(`${i+1}. ${path.join(' -> ')} -> ${path[0]}`));
      });
      
      const lodashCirculars = circular.filter(path => 
        path.some(file => 
          file.includes('lodash') || 
          file.includes('charts') ||
          file.includes('vendor')
        )
      );
      
      if (lodashCirculars.length > 0) {
        console.log(chalk.red('\n⚠️ Found circular dependencies involving lodash/charts:'));
        lodashCirculars.forEach((path, i) => {
          console.log(chalk.yellow(`${i+1}. ${path.join(' -> ')} -> ${path[0]}`));
        });
      }
    } else {
      console.log(chalk.green('✅ No circular dependencies found in your source code.'));
    }
    
    console.log(chalk.blue('\nAnalysis complete. View the results above for recommendations.'));
    
  } catch (error) {
    console.error(chalk.red('Error analyzing dependencies:'));
    console.error(error);
  }
}

// Helper function to find all JS files in a directory
async function findJsFiles(dir) {
  const result = [];
  
  if (!fs.existsSync(dir)) {
    console.log(chalk.yellow(`Directory ${dir} doesn't exist.`));
    return result;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const subDirFiles = await findJsFiles(filePath);
      result.push(...subDirFiles);
    } else if (path.extname(file) === '.js') {
      result.push(filePath);
    }
  }
  
  return result;
}

// Helper function to find references to _ in code
function findUnderscoreReferences(content) {
  const references = [];
  
  // Look for _ declarations (like "const _ = require('lodash')" or "import _ from 'lodash'")
  const declarationRegex = /(const|let|var)\s+_\s*=|import\s+_\s+from/g;
  let match;
  while ((match = declarationRegex.exec(content)) !== null) {
    const start = Math.max(0, match.index - 20);
    const end = Math.min(content.length, match.index + 60);
    
    references.push({
      type: 'declaration',
      index: match.index,
      context: content.substring(start, end)
    });
  }
  
  // Look for _ accesses
  const accessRegex = /[^a-zA-Z0-9_]\s*_\./g;
  while ((match = accessRegex.exec(content)) !== null) {
    const start = Math.max(0, match.index - 20);
    const end = Math.min(content.length, match.index + 60);
    
    references.push({
      type: 'access',
      index: match.index,
      context: content.substring(start, end)
    });
  }
  
  return references;
}

// Run the analysis
analyzeCircularDependencies();

console.log(chalk.cyan(`
=================================================================
How to fix "Cannot access '_' before initialization" in your app:
=================================================================

1. Install dependencies for this analyzer: 
   npm install madge chalk

2. Run this script:
   node analyze-lodash-deps.js

3. Based on the results, apply one of these fixes:

   a) Add lodash before your bundle:
      <script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js"></script>
      
   b) Create a lodash placeholder:
      <script>
        window._ = window._ || { 
          noop: function() {}, 
          isObject: function(obj) { return obj !== null && typeof obj === 'object'; }
        };
      </script>
      
   c) Fix the identified circular dependencies in your code
   
   d) Update your build config to extract lodash into a separate chunk
      that loads before your charts bundle
`));

// Instructions
if (process.argv.includes('--help')) {
  console.log(`
Usage: node analyze-lodash-deps.js [options]

Options:
  --help     Show this help message
  
Description:
  This script analyzes your bundled JavaScript code for potential issues
  that might cause the "Cannot access '_' before initialization" error,
  particularly focusing on lodash-related circular dependencies.

Requirements:
  - Node.js
  - madge package (npm install madge)
  - chalk package (npm install chalk)
  `);
}