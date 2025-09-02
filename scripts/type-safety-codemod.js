#!/usr/bin/env node

/**
 * Type Safety Codemod
 * 
 * This script provides automated refactoring tools for improving type safety
 * across the codebase. It can detect and fix common type safety issues,
 * convert old patterns to the new unified type system, and apply batch
 * transformations to similar components.
 * 
 * Usage:
 *   node type-safety-codemod.js --mode [scan|fix|convert] --target [directory] --dry-run
 * 
 * Examples:
 *   node type-safety-codemod.js --mode scan --target src/components
 *   node type-safety-codemod.js --mode fix --target src/services --dry-run
 *   node type-safety-codemod.js --mode convert --target src/utils --pattern any-to-unknown
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ts = require('typescript');

// Parse command line arguments
const args = process.argv.slice(2);
let mode = 'scan';
let target = 'src';
let pattern = null;
let dryRun = false;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode' && i + 1 < args.length) {
    mode = args[i + 1];
    i++;
  } else if (args[i] === '--target' && i + 1 < args.length) {
    target = args[i + 1];
    i++;
  } else if (args[i] === '--pattern' && i + 1 < args.length) {
    pattern = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

// Validate inputs
if (!['scan', 'fix', 'convert'].includes(mode)) {
  console.error('Error: Mode must be one of: scan, fix, convert');
  process.exit(1);
}

// Resolve target directory
const targetDir = path.resolve(process.cwd(), target);
if (!fs.existsSync(targetDir)) {
  console.error(`Error: Target directory ${targetDir} does not exist`);
  process.exit(1);
}

// Available transformation patterns
const PATTERNS = {
  'any-to-unknown': {
    description: 'Convert "any" types to "unknown" for better type safety',
    detect: (sourceFile) => findAnyTypes(sourceFile),
    transform: (sourceText, positions) => replaceAnyWithUnknown(sourceText, positions),
  },
  'string-literals-to-enums': {
    description: 'Convert string literals to enums for better type safety',
    detect: (sourceFile) => findStringLiteralTypes(sourceFile),
    transform: (sourceFile, positions) => replaceStringLiteralsWithEnums(sourceFile, positions),
  },
  'implicit-any-to-explicit': {
    description: 'Add explicit type annotations to variables with implicit "any" type',
    detect: (sourceFile) => findImplicitAnyTypes(sourceFile),
    transform: (sourceText, positions) => addExplicitTypeAnnotations(sourceText, positions),
  },
  'qrcode-imports': {
    description: 'Update imports to use the unified QR code type system',
    detect: (sourceFile) => findQrCodeImports(sourceFile),
    transform: (sourceText, positions) => updateQrCodeImports(sourceText, positions),
  },
};

// Display available patterns if requested
if (mode === 'convert' && !pattern) {
  console.log('Available transformation patterns:');
  Object.entries(PATTERNS).forEach(([key, { description }]) => {
    console.log(`  ${key}: ${description}`);
  });
  process.exit(0);
}

// Validate pattern for convert mode
if (mode === 'convert' && !PATTERNS[pattern]) {
  console.error(`Error: Unknown pattern "${pattern}". Run without --pattern to see available patterns.`);
  process.exit(1);
}

// Main function
async function main() {
  console.log(`Running in ${mode} mode on ${targetDir}${dryRun ? ' (dry run)' : ''}`);
  
  // Get all TypeScript files in target directory
  const tsFiles = findTypeScriptFiles(targetDir);
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  // Process files based on mode
  switch (mode) {
    case 'scan':
      await scanFiles(tsFiles);
      break;
    case 'fix':
      await fixFiles(tsFiles);
      break;
    case 'convert':
      await convertFiles(tsFiles, pattern);
      break;
  }
}

// Find all TypeScript files in directory (recursive)
function findTypeScriptFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (item !== 'node_modules' && item !== '.git') {
        results = results.concat(findTypeScriptFiles(itemPath));
      }
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      results.push(itemPath);
    }
  }
  
  return results;
}

// Scan files for type safety issues
async function scanFiles(files) {
  let issues = [];
  
  for (const file of files) {
    const sourceText = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Check for various issues
    const anyTypes = findAnyTypes(sourceFile);
    const implicitAnyTypes = findImplicitAnyTypes(sourceFile);
    const stringLiteralTypes = findStringLiteralTypes(sourceFile);
    const qrCodeImports = findQrCodeImports(sourceFile);
    
    // Collect all issues
    if (anyTypes.length > 0) {
      issues.push({ file, type: 'any-type', count: anyTypes.length, positions: anyTypes });
    }
    
    if (implicitAnyTypes.length > 0) {
      issues.push({ file, type: 'implicit-any', count: implicitAnyTypes.length, positions: implicitAnyTypes });
    }
    
    if (stringLiteralTypes.length > 0) {
      issues.push({ file, type: 'string-literal', count: stringLiteralTypes.length, positions: stringLiteralTypes });
    }
    
    if (qrCodeImports.length > 0) {
      issues.push({ file, type: 'qrcode-import', count: qrCodeImports.length, positions: qrCodeImports });
    }
  }
  
  // Group issues by type
  const issuesByType = issues.reduce((acc, issue) => {
    if (!acc[issue.type]) {
      acc[issue.type] = [];
    }
    acc[issue.type].push(issue);
    return acc;
  }, {});
  
  // Display summary
  console.log('\nIssues found:');
  Object.entries(issuesByType).forEach(([type, typeIssues]) => {
    const totalCount = typeIssues.reduce((sum, issue) => sum + issue.count, 0);
    console.log(`  ${type}: ${totalCount} issues in ${typeIssues.length} files`);
  });
  
  // Display detailed report
  console.log('\nDetailed report:');
  issues.forEach(issue => {
    console.log(`  ${issue.file}: ${issue.count} ${issue.type} issues`);
  });
}

// Fix common type safety issues automatically
async function fixFiles(files) {
  let fixedIssues = 0;
  let fixedFiles = 0;
  
  for (const file of files) {
    let sourceText = fs.readFileSync(file, 'utf8');
    let sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Apply fixes for various issues
    let modified = false;
    
    // Fix 'any' types
    const anyTypes = findAnyTypes(sourceFile);
    if (anyTypes.length > 0) {
      sourceText = replaceAnyWithUnknown(sourceText, anyTypes);
      modified = true;
      fixedIssues += anyTypes.length;
    }
    
    // Fix implicit 'any' types
    sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
    const implicitAnyTypes = findImplicitAnyTypes(sourceFile);
    if (implicitAnyTypes.length > 0) {
      sourceText = addExplicitTypeAnnotations(sourceText, implicitAnyTypes);
      modified = true;
      fixedIssues += implicitAnyTypes.length;
    }
    
    // Fix QR code imports
    sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
    const qrCodeImports = findQrCodeImports(sourceFile);
    if (qrCodeImports.length > 0) {
      sourceText = updateQrCodeImports(sourceText, qrCodeImports);
      modified = true;
      fixedIssues += qrCodeImports.length;
    }
    
    // Write changes if modified and not in dry run mode
    if (modified) {
      fixedFiles++;
      if (!dryRun) {
        fs.writeFileSync(file, sourceText, 'utf8');
        console.log(`Fixed ${file}`);
      } else {
        console.log(`Would fix ${file} (dry run)`);
      }
    }
  }
  
  console.log(`\nFixed ${fixedIssues} issues in ${fixedFiles} files${dryRun ? ' (dry run)' : ''}`);
}

// Apply specific transformation pattern to files
async function convertFiles(files, patternName) {
  const pattern = PATTERNS[patternName];
  let convertedFiles = 0;
  let convertedIssues = 0;
  
  for (const file of files) {
    let sourceText = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Apply the specific transformation
    const positions = pattern.detect(sourceFile);
    if (positions.length > 0) {
      sourceText = pattern.transform(sourceText, positions);
      convertedFiles++;
      convertedIssues += positions.length;
      
      // Write changes if not in dry run mode
      if (!dryRun) {
        fs.writeFileSync(file, sourceText, 'utf8');
        console.log(`Converted ${file}`);
      } else {
        console.log(`Would convert ${file} (dry run)`);
      }
    }
  }
  
  console.log(`\nApplied '${patternName}' pattern to ${convertedIssues} issues in ${convertedFiles} files${dryRun ? ' (dry run)' : ''}`);
}

// Find 'any' type usages
function findAnyTypes(sourceFile) {
  const anyTypes = [];
  
  function visit(node) {
    if (ts.isTypeReferenceNode(node) && 
        node.typeName.kind === ts.SyntaxKind.Identifier &&
        node.typeName.text === 'any') {
      anyTypes.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: node.getText(sourceFile)
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return anyTypes;
}

// Find implicit 'any' types
function findImplicitAnyTypes(sourceFile) {
  const implicitAnyTypes = [];
  
  function visit(node) {
    if (ts.isVariableDeclaration(node) && 
        !node.type && 
        node.initializer) {
      implicitAnyTypes.push({
        start: node.name.getStart(sourceFile),
        end: node.name.getEnd(),
        name: node.name.getText(sourceFile)
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return implicitAnyTypes;
}

// Find string literal types
function findStringLiteralTypes(sourceFile) {
  const stringLiteralTypes = [];
  
  function visit(node) {
    if (ts.isLiteralTypeNode(node) && 
        ts.isStringLiteral(node.literal)) {
      stringLiteralTypes.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: node.getText(sourceFile),
        value: node.literal.text
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return stringLiteralTypes;
}

// Find QR code related imports
function findQrCodeImports(sourceFile) {
  const qrCodeImports = [];
  
  function visit(node) {
    if (ts.isImportDeclaration(node) && 
        node.moduleSpecifier && 
        ts.isStringLiteral(node.moduleSpecifier) &&
        (node.moduleSpecifier.text.includes('qrCodeService') ||
         node.moduleSpecifier.text.includes('qrCodeValidator') ||
         node.moduleSpecifier.text.includes('standardQrCodeGenerator'))) {
      
      qrCodeImports.push({
        start: node.getStart(sourceFile),
        end: node.getEnd(),
        text: node.getText(sourceFile),
        moduleSpecifier: node.moduleSpecifier.text
      });
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return qrCodeImports;
}

// Replace 'any' with 'unknown'
function replaceAnyWithUnknown(sourceText, positions) {
  // Sort positions in reverse order to avoid offset issues
  positions.sort((a, b) => b.start - a.start);
  
  let result = sourceText;
  for (const pos of positions) {
    result = result.substring(0, pos.start) + 'unknown' + result.substring(pos.start + 3);
  }
  
  return result;
}

// Add explicit type annotations
function addExplicitTypeAnnotations(sourceText, positions) {
  // Sort positions in reverse order to avoid offset issues
  positions.sort((a, b) => b.start - a.start);
  
  let result = sourceText;
  for (const pos of positions) {
    result = result.substring(0, pos.end) + ': unknown' + result.substring(pos.end);
  }
  
  return result;
}

// Update QR code imports
function updateQrCodeImports(sourceText, positions) {
  // Sort positions in reverse order to avoid offset issues
  positions.sort((a, b) => b.start - a.start);
  
  let result = sourceText;
  for (const pos of positions) {
    // Replace with import from unified type system
    const newImport = `import { QrCodeType, QrCodeData, CustomerQrCodeData, LoyaltyCardQrCodeData, PromoCodeQrCodeData } from '../types/qrCode';`;
    result = result.substring(0, pos.start) + newImport + result.substring(pos.end);
  }
  
  return result;
}

// Replace string literals with enums
function replaceStringLiteralsWithEnums(sourceText, positions) {
  // Group string literals by value to identify potential enums
  const valueGroups = positions.reduce((groups, pos) => {
    if (!groups[pos.value]) {
      groups[pos.value] = [];
    }
    groups[pos.value].push(pos);
    return groups;
  }, {});
  
  // Only process groups with multiple occurrences
  const enumCandidates = Object.entries(valueGroups)
    .filter(([_, positions]) => positions.length > 1)
    .map(([value, _]) => value);
  
  if (enumCandidates.length === 0) {
    return sourceText;
  }
  
  // Create enum definition
  const enumName = guessEnumName(enumCandidates);
  const enumDefinition = `enum ${enumName} {\n` +
    enumCandidates.map(value => `  ${toEnumKey(value)} = '${value}'`).join(',\n') +
    `\n}\n\n`;
  
  // Add enum definition at the beginning of the file
  let result = enumDefinition + sourceText;
  
  // Replace string literals with enum references
  // Sort positions in reverse order to avoid offset issues
  positions.sort((a, b) => b.start - a.start);
  
  for (const pos of positions) {
    if (enumCandidates.includes(pos.value)) {
      const enumReference = `${enumName}.${toEnumKey(pos.value)}`;
      result = result.substring(0, pos.start + enumDefinition.length) + 
               enumReference + 
               result.substring(pos.end + enumDefinition.length);
    }
  }
  
  return result;
}

// Helper to guess enum name based on values
function guessEnumName(values) {
  // Try to find common prefix or theme in values
  const commonPrefix = findCommonPrefix(values);
  if (commonPrefix && commonPrefix.length > 2) {
    return toPascalCase(commonPrefix) + 'Type';
  }
  
  // Default to a generic name
  return 'StringLiteralEnum';
}

// Helper to find common prefix in strings
function findCommonPrefix(strings) {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];
  
  let prefix = '';
  const firstString = strings[0];
  
  for (let i = 0; i < firstString.length; i++) {
    const char = firstString[i];
    if (strings.every(s => s[i] === char)) {
      prefix += char;
    } else {
      break;
    }
  }
  
  return prefix;
}

// Helper to convert string to PascalCase
function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

// Helper to convert string to enum key
function toEnumKey(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 