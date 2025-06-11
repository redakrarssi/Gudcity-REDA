// PWA Icon Generator Script
// This script can be run to generate the missing PWA icons for your manifest

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Configuration
const sourceIcon = process.argv[2] || './public/favicon.ico'; // Use favicon.ico as source or provide a path
const outputDir = './public/assets';
const iconSizes = [192, 512]; // Common PWA icon sizes

async function generateIcons() {
  try {
    console.log(`Generating PWA icons from source: ${sourceIcon}`);
    
    // Make sure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }
    
    // Load the source image
    const sourceImage = await loadImage(sourceIcon);
    
    // Generate icons in all required sizes
    for (const size of iconSizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Draw image with proper scaling
      ctx.drawImage(sourceImage, 0, 0, size, size);
      
      // Save the resized image
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      
      stream.pipe(out);
      out.on('finish', () => console.log(`Created icon: ${outputPath}`));
    }
    
    // Create or update manifest.json if it doesn't exist
    const manifestPath = './public/manifest.json';
    
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      const manifestData = fs.readFileSync(manifestPath, 'utf8');
      try {
        manifest = JSON.parse(manifestData);
      } catch (e) {
        console.error(`Error parsing existing manifest.json: ${e.message}`);
        manifest = {};
      }
    }
    
    // Update icons in manifest
    manifest.icons = iconSizes.map(size => ({
      src: `/assets/icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any maskable"
    }));
    
    // Add other essential manifest fields if missing
    if (!manifest.name) manifest.name = "Gudcity REDA";
    if (!manifest.short_name) manifest.short_name = "Gudcity";
    if (!manifest.theme_color) manifest.theme_color = "#ffffff";
    if (!manifest.background_color) manifest.background_color = "#ffffff";
    if (!manifest.display) manifest.display = "standalone";
    if (!manifest.start_url) manifest.start_url = "/";
    
    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Updated manifest.json with new icons`);
    
    console.log('\nPWA icons generated successfully!');
    console.log('Make sure to include the manifest.json in your HTML:');
    console.log('<link rel="manifest" href="/manifest.json" />');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Instructions for use
if (process.argv.includes('--help')) {
  console.log(`
PWA Icon Generator
-----------------
Generates PWA icons for manifest.json from a source image.

Usage: 
  node pwa-icon-generator.js [source-icon-path]

Arguments:
  source-icon-path  Path to source icon (default: ./public/favicon.ico)
  
Requirements:
  - Node.js 
  - Canvas package (npm install canvas)
  
Example:
  node pwa-icon-generator.js ./my-logo.png
  `);
  process.exit(0);
}

// Run the generator
generateIcons(); 