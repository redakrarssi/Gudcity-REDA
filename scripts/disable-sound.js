/**
 * Script to disable the beep sound in the QR scanner
 */

const fs = require('fs');
const path = require('path');

console.log('Disabling QR scanner sound...');

// Create an empty sound file
const soundPath = path.join(__dirname, '..', 'public', 'assets', 'sounds', 'beep-success.mp3');
fs.writeFileSync(soundPath, ''); // Write empty file

console.log('QR scanner sound disabled successfully!'); 