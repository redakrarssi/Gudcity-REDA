#!/usr/bin/env node

/**
 * Script to validate that file changes don't violate AI safety guidelines
 * Usage: node scripts/check-ai-changes.js file1.js file2.js
 * 
 * This script checks modified files against the .ai-guidelines rules
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get modified files from git if not provided as arguments
const getModifiedFiles = () => {
  try {
    const output = execSync('git diff --name-only').toString();
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting modified files from git:', error.message);
    return [];
  }
};

// Parse the .ai-guidelines file
const parseAIGuidelines = () => {
  try {
    const guidelinesPath = path.join(process.cwd(), '.ai-guidelines');
    
    if (!fs.existsSync(guidelinesPath)) {
      console.error('Error: .ai-guidelines file not found');
      return { noModify: [], seekClarification: [] };
    }
    
    const content = fs.readFileSync(guidelinesPath, 'utf8');
    const lines = content.split('\n');
    
    const noModify = [];
    const seekClarification = [];
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
      }
      
      const [pattern, rule] = line.trim().split(/\s+/);
      
      if (rule === 'no-modify') {
        noModify.push(pattern);
      } else if (rule === 'seek-clarification') {
        seekClarification.push(pattern);
      }
    }
    
    return { noModify, seekClarification };
  } catch (error) {
    console.error('Error parsing .ai-guidelines:', error.message);
    return { noModify: [], seekClarification: [] };
  }
};

// Check if a file matches any pattern in a list
const matchesPattern = (filePath, patterns) => {
  for (const pattern of patterns) {
    // Support basic glob patterns with * wildcard
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) {
        return true;
      }
    } else if (filePath === pattern) {
      return true;
    }
  }
  return false;
};

// Main function
const main = () => {
  const filesToCheck = process.argv.length > 2 
    ? process.argv.slice(2)
    : getModifiedFiles();
    
  if (filesToCheck.length === 0) {
    console.log('No files to check.');
    return;
  }
  
  const { noModify, seekClarification } = parseAIGuidelines();
  let hasViolations = false;
  
  console.log('\x1b[1mChecking AI safety guidelines for modified files:\x1b[0m');
  
  for (const file of filesToCheck) {
    if (matchesPattern(file, noModify)) {
      console.log(`\x1b[31m✖ ${file} - DO NOT MODIFY (critical file)\x1b[0m`);
      hasViolations = true;
    } else if (matchesPattern(file, seekClarification)) {
      console.log(`\x1b[33m⚠ ${file} - SEEK CLARIFICATION before modifying\x1b[0m`);
    } else {
      console.log(`\x1b[32m✓ ${file} - OK to modify\x1b[0m`);
    }
  }
  
  if (hasViolations) {
    console.log('\n\x1b[31m⚠ WARNING: Some modified files violate AI safety guidelines!\x1b[0m');
    console.log('Please review reda.md for guidance.');
    process.exit(1);
  } else {
    console.log('\n\x1b[32mAll file changes comply with AI safety guidelines.\x1b[0m');
  }
};

main(); 