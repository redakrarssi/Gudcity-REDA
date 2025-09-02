#!/usr/bin/env node

/**
 * Script to install Git hooks for AI safety checks
 * This will add a pre-commit hook that runs check-ai-changes.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the Git hooks directory
const getGitHooksDir = () => {
  try {
    const gitDir = execSync('git rev-parse --git-dir').toString().trim();
    return path.join(process.cwd(), gitDir, 'hooks');
  } catch (error) {
    console.error('Error finding Git directory:', error.message);
    return null;
  }
};

// Create or update pre-commit hook
const createPreCommitHook = (hooksDir) => {
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  
  // Create hook content
  const hookContent = `#!/bin/sh
# AI Safety Pre-commit Hook
# This hook checks if any modified files violate AI safety guidelines

echo "Running AI safety checks..."
node "${path.join(process.cwd(), 'scripts', 'check-ai-changes.js')}"
if [ $? -ne 0 ]; then
  echo "AI safety check failed. Please review your changes."
  exit 1
fi
`;

  // Write the hook file
  try {
    fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });
    console.log(`✅ Successfully created pre-commit hook at ${preCommitPath}`);
    return true;
  } catch (error) {
    console.error('Error creating pre-commit hook:', error.message);
    return false;
  }
};

// For Windows, create a batch file version
const createWindowsPreCommitHook = (hooksDir) => {
  const preCommitPath = path.join(hooksDir, 'pre-commit.bat');
  
  // Create hook content for Windows
  const hookContent = `@echo off
echo Running AI safety checks...
node "${path.join(process.cwd(), 'scripts', 'check-ai-changes.js').replace(/\\/g, '\\\\')}"
if %ERRORLEVEL% neq 0 (
  echo AI safety check failed. Please review your changes.
  exit /b 1
)
exit /b 0
`;

  // Write the hook file
  try {
    fs.writeFileSync(preCommitPath, hookContent);
    console.log(`✅ Successfully created Windows pre-commit hook at ${preCommitPath}`);
    return true;
  } catch (error) {
    console.error('Error creating Windows pre-commit hook:', error.message);
    return false;
  }
};

// Main function
const main = () => {
  console.log('Installing AI safety Git hooks...');
  
  const hooksDir = getGitHooksDir();
  if (!hooksDir) {
    console.error('❌ Failed to find Git hooks directory');
    process.exit(1);
  }
  
  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  
  // Create appropriate hook based on platform
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    createWindowsPreCommitHook(hooksDir);
  } else {
    createPreCommitHook(hooksDir);
  }
  
  console.log('\nAI safety hooks installed successfully!');
  console.log('These hooks will check your changes against AI safety guidelines before each commit.');
};

main(); 