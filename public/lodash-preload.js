/**
 * Lodash Preload
 * Minimal implementation of lodash to prevent errors in scripts that depend on it
 */

(function() {
  console.log('Initializing Lodash preload');
  
  // Create lodash global reference if it doesn't exist
  var _ = window._ = window._ || {};
  
  // Basic utility functions often used
  _.noop = function() {};
  _.identity = function(value) { return value; };
  
  // Type checking functions
  _.isObject = function(obj) { return obj !== null && typeof obj === 'object'; };
  _.isFunction = function(f) { return typeof f === 'function'; };
  _.isArray = Array.isArray;
  _.isString = function(s) { return typeof s === 'string'; };
  _.isNumber = function(n) { return typeof n === 'number'; };
  _.isBoolean = function(b) { return typeof b === 'boolean'; };
  _.isUndefined = function(val) { return val === undefined; };
  _.isNull = function(val) { return val === null; };
  
  // Collection functions
  _.forEach = function(collection, iteratee) {
    if (Array.isArray(collection)) {
      for (var i = 0; i < collection.length; i++) {
        iteratee(collection[i], i, collection);
      }
    } else if (collection && typeof collection === 'object') {
      for (var key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          iteratee(collection[key], key, collection);
        }
      }
    }
    return collection;
  };
  
  _.map = function(collection, iteratee) {
    var result = [];
    
    if (Array.isArray(collection)) {
      for (var i = 0; i < collection.length; i++) {
        result.push(iteratee(collection[i], i, collection));
      }
    } else if (collection && typeof collection === 'object') {
      for (var key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          result.push(iteratee(collection[key], key, collection));
        }
      }
    }
    
    return result;
  };
  
  // Object functions
  _.get = function(obj, path, defaultValue) {
    if (obj == null) return defaultValue;
    
    // Handle array path ['a', 'b'] or string path 'a.b'
    var keys = Array.isArray(path) ? path : 
               typeof path === 'string' ? path.split('.') : [path];
    
    var result = obj;
    for (var i = 0; i < keys.length; i++) {
      if (result == null) return defaultValue;
      result = result[keys[i]];
    }
    
    return result === undefined ? defaultValue : result;
  };
  
  _.set = function(obj, path, value) {
    if (obj == null) return obj;
    
    var keys = Array.isArray(path) ? path : 
               typeof path === 'string' ? path.split('.') : [path];
    
    var current = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      var key = keys[i];
      if (current[key] == null) {
        // Determine if next key is an integer, create array if so
        current[key] = /^\d+$/.test(keys[i+1]) ? [] : {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  };
  
  // Array functions
  _.first = function(array) {
    return array && array.length ? array[0] : undefined;
  };
  
  _.last = function(array) {
    return array && array.length ? array[array.length - 1] : undefined;
  };
  
  console.log('Lodash preload initialized');
})(); 