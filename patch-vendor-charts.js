import fs from 'fs';
import path from 'path';

// The path to the vendor charts file
const chartsBundlePath = path.join('dist', 'js', 'vendor-charts-CSC0NdPU.js');

console.log(`Patching ${chartsBundlePath}...`);

try {
  // Read the file
  let content = fs.readFileSync(chartsBundlePath, 'utf8');
  
  // Create the patched version
  const patchedContent = `
// Lodash initialization to prevent TDZ errors
var _ = (typeof window !== 'undefined' && window._) || {
  noop: function() {},
  identity: function(value) { return value; },
  isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
  isFunction: function(f) { return typeof f === 'function'; },
  isArray: Array.isArray,
  forEach: function(collection, iteratee) {
    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) iteratee(collection[i], i, collection);
    } else if (collection && typeof collection === 'object') {
      for (let key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          iteratee(collection[key], key, collection);
        }
      }
    }
    return collection;
  },
  map: function(collection, iteratee) {
    const result = [];
    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) result.push(iteratee(collection[i], i, collection));
    } else if (collection && typeof collection === 'object') {
      for (let key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          result.push(iteratee(collection[key], key, collection));
        }
      }
    }
    return result;
  }
};

// Original file content follows
${content}`;
  
  // Back up the original file
  const backupPath = `${chartsBundlePath}.backup`;
  fs.writeFileSync(backupPath, content);
  console.log(`Original file backed up to ${backupPath}`);
  
  // Write the patched file
  fs.writeFileSync(chartsBundlePath, patchedContent);
  console.log(`Successfully patched ${chartsBundlePath}`);
  
  console.log('\nAlso fixing manifest.json paths...');
  
  // Fix manifest.json paths
  const manifestPath = path.join('dist', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    let manifest;
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      manifest = JSON.parse(manifestContent);
      
      // Fix paths by ensuring they have proper leading slashes
      if (manifest.icons) {
        manifest.icons.forEach(icon => {
          if (icon.src && !icon.src.startsWith('http') && !icon.src.startsWith('/')) {
            icon.src = '/' + icon.src.replace(/^\/+/, '');
          }
        });
      }
      
      if (manifest.start_url && !manifest.start_url.startsWith('http') && !manifest.start_url.startsWith('/')) {
        manifest.start_url = '/' + manifest.start_url.replace(/^\/+/, '');
      }
      
      // Fix shortcuts
      if (manifest.shortcuts) {
        manifest.shortcuts.forEach(shortcut => {
          if (shortcut.url && !shortcut.url.startsWith('http') && !shortcut.url.startsWith('/')) {
            shortcut.url = '/' + shortcut.url.replace(/^\/+/, '');
          }
        });
      }
      
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`Successfully fixed paths in ${manifestPath}`);
    } catch (err) {
      console.error(`Error processing manifest: ${err.message}`);
    }
  } else {
    console.log(`Manifest file not found at ${manifestPath}`);
  }
  
} catch (err) {
  console.error(`Error patching file: ${err.message}`);
  process.exit(1);
} 