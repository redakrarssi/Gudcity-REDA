/**
 * Script to patch the vendor-charts bundle to prevent lodash initialization errors
 * Run this after the build process before deploying
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find all vendor-charts JS files in the dist directory
console.log('Looking for vendor-charts files...');
glob('dist/js/vendor-charts-*.js').then((files) => {
  if (files.length === 0) {
    console.warn('No vendor-charts files found. Checking for recharts bundle...');
    
    // Look for any recharts-containing bundles as a fallback
    glob('dist/js/*.js').then((allFiles) => {
      const chartsFiles = allFiles.filter(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          return content.includes('recharts') || content.includes('_.');
        } catch (err) {
          return false;
        }
      });
      
      if (chartsFiles.length === 0) {
        console.error('No charts-related files found. Nothing to patch.');
        process.exit(0);
      }
      
      patchFiles(chartsFiles);
    }).catch(err => {
      console.error('Error finding JS files:', err);
      process.exit(1);
    });
  } else {
    patchFiles(files);
  }
}).catch(err => {
  console.error('Error finding vendor-charts files:', err);
  process.exit(1);
});

function patchFiles(files) {
  console.log(`Found ${files.length} file(s) to patch:`);
  files.forEach(file => console.log(`- ${file}`));
  
  files.forEach(file => {
    try {
      console.log(`Processing ${file}...`);
      const content = fs.readFileSync(file, 'utf8');
      
      // Create a backup of the original file
      const backupFile = `${file}.backup`;
      fs.writeFileSync(backupFile, content);
      console.log(`Created backup at ${backupFile}`);
      
      // Create the patch with lodash pre-initialization
      const patchedContent = `// Lodash pre-initialization to prevent "Cannot access '_' before initialization" errors
window._ = window._ || {
  noop: function() {},
  identity: function(value) { return value; },
  isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
  isFunction: function(f) { return typeof f === 'function'; },
  isArray: Array.isArray,
  forEach: function(collection, iteratee) {
    if (Array.isArray(collection)) {
      for (var i = 0; i < collection.length; i++) iteratee(collection[i], i, collection);
    } else if (collection && typeof collection === 'object') {
      for (var key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          iteratee(collection[key], key, collection);
        }
      }
    }
    return collection;
  },
  map: function(collection, iteratee) {
    var result = [];
    if (Array.isArray(collection)) {
      for (var i = 0; i < collection.length; i++) result.push(iteratee(collection[i], i, collection));
    } else if (collection && typeof collection === 'object') {
      for (var key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          result.push(iteratee(collection[key], key, collection));
        }
      }
    }
    return result;
  },
  get: function(obj, path, defaultValue) {
    if (!obj) return defaultValue;
    var pathArray = Array.isArray(path) ? path : String(path).split('.');
    var result = obj;
    for (var i = 0; i < pathArray.length; i++) {
      if (result == null) return defaultValue;
      result = result[pathArray[i]];
    }
    return result === undefined ? defaultValue : result;
  },
  find: function(collection, predicate) {
    if (Array.isArray(collection)) {
      return collection.find(predicate);
    }
    var keys = Object.keys(collection || {});
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (predicate(collection[key], key, collection)) {
        return collection[key];
      }
    }
    return undefined;
  }
};

${content}`;
      
      // Write the patched content back to the file
      fs.writeFileSync(file, patchedContent);
      console.log(`Successfully patched ${file}`);
    } catch (err) {
      console.error(`Error patching ${file}:`, err);
    }
  });
  
  console.log('All files processed.');
} 