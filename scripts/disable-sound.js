/**
 * Script to disable the beep sound in the QR scanner
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Disabling QR scanner sound...');

// Create an empty sound file
const soundPath = path.join(__dirname, '..', 'public', 'assets', 'sounds', 'beep-success.mp3');
fs.writeFileSync(soundPath, ''); // Write empty file

console.log('QR scanner sound disabled successfully!'); 