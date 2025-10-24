/**
 * Cleanup script to remove individual API files that are now consolidated
 * This helps maintain a clean codebase and avoid confusion
 * 
 * Run with: node cleanup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to remove (now handled by consolidated handler)
const filesToRemove = [
  'api/security/audit.ts',
  'api/loyalty/cards/customer/[id].ts',
  'api/customers/[id]/programs.ts',
  'api/notifications.ts',
  'api/promotions.ts'
];

console.log('🧹 Starting cleanup of consolidated API files...');

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
    } else {
      console.log(`⚠️ File not found: ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error removing ${file}:`, err);
  }
});

console.log('🎉 Cleanup complete!');
console.log('📝 Note: These endpoints are now handled by api/v1/[[...path]].ts');
