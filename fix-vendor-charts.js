// Script to fix vendor-charts lodash initialization issues
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find the vendor-charts file using a glob pattern
const vendorChartsFiles = await glob('dist/js/vendor-charts-*.js');

if (vendorChartsFiles.length === 0) {
  console.error('No vendor-charts file found in dist/js/');
  process.exit(1);
}

const vendorChartsFile = vendorChartsFiles[0];
console.log(`Found vendor charts file: ${vendorChartsFile}`);

try {
  // Read the file content
  const content = fs.readFileSync(vendorChartsFile, 'utf8');
  
  // Create backup
  const backupFile = `${vendorChartsFile}.backup`;
  console.log(`Creating backup at: ${backupFile}`);
  fs.writeFileSync(backupFile, content);
  
  // Prepare the patched content with lodash pre-initialization
  const patchedContent = `// Lodash pre-initialization to prevent reference errors
var _ = window._ = window._ || {
  noop: function() {},
  identity: function(value) { return value; },
  constant: function(value) { return function() { return value; }; },
  isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
  isFunction: function(f) { return typeof f === 'function'; },
  isArray: Array.isArray,
  isString: function(value) { return typeof value === 'string'; },
  isNumber: function(value) { return typeof value === 'number'; },
  isUndefined: function(value) { return value === undefined; },
  isNil: function(value) { return value == null; },
  isNaN: isNaN,
  isFinite: isFinite,
  each: function(collection, iteratee) {
    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) {
        iteratee(collection[i], i, collection);
      }
    } else if (typeof collection === 'object' && collection !== null) {
      for (const key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          iteratee(collection[key], key, collection);
        }
      }
    }
    return collection;
  },
  forEach: function(collection, iteratee) {
    return this.each(collection, iteratee);
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
  
  // Write the patched content back to the file
  console.log(`Writing patched content to: ${vendorChartsFile}`);
  fs.writeFileSync(vendorChartsFile, patchedContent);
  
  console.log('Patching completed successfully!');
} catch (error) {
  console.error(`Error patching file: ${error.message}`);
  process.exit(1);
} 