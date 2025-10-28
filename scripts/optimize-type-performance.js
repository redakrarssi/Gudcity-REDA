#!/usr/bin/env node

/**
 * Type System Performance Optimizer
 * 
 * This script analyzes and optimizes the TypeScript type system performance
 * by identifying and fixing common performance bottlenecks:
 * 
 * 1. Excessive type recursion
 * 2. Overly complex conditional types
 * 3. Large union types
 * 4. Inefficient type imports
 * 5. Type-only imports that should be moved to .d.ts files
 * 
 * Usage:
 *   node optimize-type-performance.js [--fix] [--report-only]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ts = require('typescript');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const reportOnly = args.includes('--report-only');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TS_CONFIG_PATH = path.join(PROJECT_ROOT, 'tsconfig.json');
const TYPE_DIRS = ['src/types'];
const PERFORMANCE_THRESHOLD = {
  unionMemberCount: 50,
  conditionalTypeDepth: 3,
  typeParameterCount: 5,
  importCount: 20
};

// Performance issues tracking
const issues = {
  largeUnionTypes: [],
  complexConditionalTypes: [],
  recursiveTypes: [],
  inefficientImports: [],
  typeOnlyImports: []
};

/**
 * Main function
 */
async function main() {
  console.log('TypeScript Performance Optimizer');
  console.log('===============================');
  
  // Read tsconfig.json
  const tsConfig = JSON.parse(fs.readFileSync(TS_CONFIG_PATH, 'utf8'));
  
  // Get compilation time baseline
  const baselineTime = measureCompilationTime();
  console.log(`Current TypeScript compilation time: ${baselineTime}ms`);
  
  // Find all TypeScript files
  const tsFiles = findTypeScriptFiles(PROJECT_ROOT);
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  // Analyze files
  console.log('\nAnalyzing files for performance issues...');
  for (const file of tsFiles) {
    analyzeFile(file);
  }
  
  // Report issues
  reportIssues();
  
  // Fix issues if requested
  if (shouldFix) {
    console.log('\nFixing issues...');
    fixIssues();
    
    // Measure compilation time after fixes
    const optimizedTime = measureCompilationTime();
    console.log(`\nOptimized TypeScript compilation time: ${optimizedTime}ms`);
    console.log(`Improvement: ${Math.round((baselineTime - optimizedTime) / baselineTime * 100)}%`);
  }
}

/**
 * Find all TypeScript files in directory (recursive)
 */
function findTypeScriptFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'build' && item !== 'coverage') {
        results = results.concat(findTypeScriptFiles(itemPath));
      }
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      results.push(itemPath);
    }
  }
  
  return results;
}

/**
 * Measure TypeScript compilation time
 */
function measureCompilationTime() {
  const start = Date.now();
  try {
    execSync('npx tsc --noEmit', { stdio: 'ignore' });
  } catch (error) {
    // Ignore compilation errors, we just want to measure time
  }
  return Date.now() - start;
}

/**
 * Analyze a TypeScript file for performance issues
 */
function analyzeFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true
  );
  
  // Check for large union types
  findLargeUnionTypes(sourceFile, filePath);
  
  // Check for complex conditional types
  findComplexConditionalTypes(sourceFile, filePath);
  
  // Check for recursive types
  findRecursiveTypes(sourceFile, filePath);
  
  // Check for inefficient imports
  findInefficientImports(sourceFile, filePath);
  
  // Check for type-only imports
  findTypeOnlyImports(sourceFile, filePath);
}

/**
 * Find large union types
 */
function findLargeUnionTypes(sourceFile, filePath) {
  function visit(node) {
    if (ts.isUnionTypeNode(node) && node.types.length > PERFORMANCE_THRESHOLD.unionMemberCount) {
      issues.largeUnionTypes.push({
        file: filePath,
        line: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
        memberCount: node.types.length,
        text: node.getText(sourceFile)
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
}

/**
 * Find complex conditional types
 */
function findComplexConditionalTypes(sourceFile, filePath) {
  function visit(node) {
    if (ts.isConditionalTypeNode(node)) {
      const depth = getConditionalTypeDepth(node);
      if (depth > PERFORMANCE_THRESHOLD.conditionalTypeDepth) {
        issues.complexConditionalTypes.push({
          file: filePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1,
          depth,
          text: node.getText(sourceFile)
        });
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
}

/**
 * Get the depth of nested conditional types
 */
function getConditionalTypeDepth(node, depth = 1) {
  let maxDepth = depth;
  
  if (ts.isConditionalTypeNode(node.trueType)) {
    maxDepth = Math.max(maxDepth, getConditionalTypeDepth(node.trueType, depth + 1));
  }
  
  if (ts.isConditionalTypeNode(node.falseType)) {
    maxDepth = Math.max(maxDepth, getConditionalTypeDepth(node.falseType, depth + 1));
  }
  
  return maxDepth;
}

/**
 * Find recursive types
 */
function findRecursiveTypes(sourceFile, filePath) {
  const typeNames = new Set();
  const recursiveTypes = new Set();
  
  // First pass: collect type names
  function collectTypeNames(node) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      typeNames.add(node.name.text);
    }
    
    ts.forEachChild(node, collectTypeNames);
  }
  
  collectTypeNames(sourceFile);
  
  // Second pass: check for recursive references
  function checkRecursiveTypes(node) {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;
      
      function checkType(typeNode) {
        if (ts.isTypeReferenceNode(typeNode) && 
            typeNode.typeName.kind === ts.SyntaxKind.Identifier &&
            typeNode.typeName.text === typeName) {
          recursiveTypes.add(typeName);
        }
        
        ts.forEachChild(typeNode, checkType);
      }
      
      if (ts.isInterfaceDeclaration(node)) {
        node.members.forEach(member => {
          if (member.type) {
            checkType(member.type);
          }
        });
      } else if (ts.isTypeAliasDeclaration(node) && node.type) {
        checkType(node.type);
      }
    }
    
    ts.forEachChild(node, checkRecursiveTypes);
  }
  
  checkRecursiveTypes(sourceFile);
  
  // Add recursive types to issues
  recursiveTypes.forEach(typeName => {
    issues.recursiveTypes.push({
      file: filePath,
      typeName
    });
  });
}

/**
 * Find inefficient imports
 */
function findInefficientImports(sourceFile, filePath) {
  const imports = [];
  
  // Collect all imports
  function collectImports(node) {
    if (ts.isImportDeclaration(node)) {
      imports.push(node);
    }
    
    ts.forEachChild(node, collectImports);
  }
  
  collectImports(sourceFile);
  
  // Check for too many imports
  if (imports.length > PERFORMANCE_THRESHOLD.importCount) {
    issues.inefficientImports.push({
      file: filePath,
      importCount: imports.length
    });
  }
  
  // Check for wildcard imports
  imports.forEach(importNode => {
    if (importNode.importClause && importNode.importClause.namedBindings &&
        ts.isNamespaceImport(importNode.importClause.namedBindings)) {
      issues.inefficientImports.push({
        file: filePath,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.pos).line + 1,
        text: importNode.getText(sourceFile),
        issue: 'wildcard-import'
      });
    }
  });
}

/**
 * Find type-only imports
 */
function findTypeOnlyImports(sourceFile, filePath) {
  // Only check .ts/.tsx files, not .d.ts files
  if (filePath.endsWith('.d.ts')) {
    return;
  }
  
  const imports = [];
  const typeOnlyImports = [];
  
  // Collect all imports
  function collectImports(node) {
    if (ts.isImportDeclaration(node)) {
      imports.push(node);
    }
    
    ts.forEachChild(node, collectImports);
  }
  
  collectImports(sourceFile);
  
  // Check for type-only imports
  imports.forEach(importNode => {
    if (importNode.importClause && importNode.importClause.isTypeOnly) {
      typeOnlyImports.push({
        file: filePath,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.pos).line + 1,
        text: importNode.getText(sourceFile)
      });
    }
  });
  
  if (typeOnlyImports.length > 0) {
    issues.typeOnlyImports.push({
      file: filePath,
      imports: typeOnlyImports
    });
  }
}

/**
 * Report all issues found
 */
function reportIssues() {
  console.log('\nPerformance Issues Report');
  console.log('========================');
  
  // Report large union types
  if (issues.largeUnionTypes.length > 0) {
    console.log(`\nLarge Union Types (${issues.largeUnionTypes.length}):`);
    issues.largeUnionTypes.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.memberCount} members`);
    });
  }
  
  // Report complex conditional types
  if (issues.complexConditionalTypes.length > 0) {
    console.log(`\nComplex Conditional Types (${issues.complexConditionalTypes.length}):`);
    issues.complexConditionalTypes.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - Depth: ${issue.depth}`);
    });
  }
  
  // Report recursive types
  if (issues.recursiveTypes.length > 0) {
    console.log(`\nRecursive Types (${issues.recursiveTypes.length}):`);
    issues.recursiveTypes.forEach(issue => {
      console.log(`  ${issue.file} - Type: ${issue.typeName}`);
    });
  }
  
  // Report inefficient imports
  if (issues.inefficientImports.length > 0) {
    console.log(`\nInefficient Imports (${issues.inefficientImports.length}):`);
    issues.inefficientImports.forEach(issue => {
      if (issue.issue === 'wildcard-import') {
        console.log(`  ${issue.file}:${issue.line} - Wildcard import`);
      } else {
        console.log(`  ${issue.file} - ${issue.importCount} imports`);
      }
    });
  }
  
  // Report type-only imports
  if (issues.typeOnlyImports.length > 0) {
    console.log(`\nType-Only Imports (${issues.typeOnlyImports.length} files):`);
    issues.typeOnlyImports.forEach(issue => {
      console.log(`  ${issue.file} - ${issue.imports.length} type-only imports`);
    });
  }
  
  // Summary
  const totalIssues = 
    issues.largeUnionTypes.length + 
    issues.complexConditionalTypes.length + 
    issues.recursiveTypes.length + 
    issues.inefficientImports.length + 
    issues.typeOnlyImports.length;
  
  console.log(`\nTotal Issues: ${totalIssues}`);
}

/**
 * Fix identified issues
 */
function fixIssues() {
  if (reportOnly) {
    console.log('Skipping fixes in report-only mode');
    return;
  }
  
  // Fix large union types by splitting them into smaller chunks
  issues.largeUnionTypes.forEach(issue => {
    const sourceText = fs.readFileSync(issue.file, 'utf8');
    const sourceFile = ts.createSourceFile(
      issue.file,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
    
    // This is a complex fix that would require more sophisticated parsing
    // For now, we just log the recommendation
    console.log(`Consider splitting large union type at ${issue.file}:${issue.line}`);
  });
  
  // Fix inefficient imports by replacing wildcards with named imports
  issues.inefficientImports
    .filter(issue => issue.issue === 'wildcard-import')
    .forEach(issue => {
      const sourceText = fs.readFileSync(issue.file, 'utf8');
      const sourceFile = ts.createSourceFile(
        issue.file,
        sourceText,
        ts.ScriptTarget.Latest,
        true
      );
      
      // This is a complex fix that would require more sophisticated parsing
      // For now, we just log the recommendation
      console.log(`Consider replacing wildcard import at ${issue.file}:${issue.line}`);
    });
  
  // Move type-only imports to .d.ts files
  issues.typeOnlyImports.forEach(issue => {
    const dtsFile = issue.file.replace(/\.tsx?$/, '.d.ts');
    
    // Check if .d.ts file exists, create if not
    if (!fs.existsSync(dtsFile)) {
      fs.writeFileSync(dtsFile, '// Type definitions\n\n');
      console.log(`Created ${dtsFile}`);
    }
    
    // This is a complex fix that would require more sophisticated parsing
    // For now, we just log the recommendation
    console.log(`Consider moving type-only imports from ${issue.file} to ${dtsFile}`);
  });
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 