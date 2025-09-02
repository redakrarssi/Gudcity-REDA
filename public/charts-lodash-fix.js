/**
 * Charts-Lodash Integration Fix
 * Provides integration fixes between chart libraries and lodash
 */

(function() {
  console.log('Loading charts-lodash integration fix');
  
  // Ensure we have bare minimum objects defined globally
  if (!window._) {
    console.warn('Lodash not detected, creating minimal implementation');
    window._ = {
      noop: function() {},
      identity: function(value) { return value; },
      isObject: function(obj) { return obj !== null && typeof obj === 'object'; },
      isFunction: function(f) { return typeof f === 'function'; },
      isArray: Array.isArray,
      get: function(obj, path, defaultValue) {
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
      },
      forEach: function(collection, iteratee) {
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
      }
    };
  }
  
  // Ensure Chart exists
  if (!window.Chart) {
    console.warn('Chart library not detected');
    window.Chart = window.Chart || function() {
      return {
        update: function() {},
        destroy: function() {}
      };
    };
  }
  
  // Fix for specific lodash functions used in charts
  var lodashFunctionsForCharts = {
    isObjectLike: function(value) {
      return typeof value === 'object' && value !== null;
    },
    keys: function(obj) {
      return Object.keys(obj || {});
    },
    isNil: function(value) {
      return value == null;
    },
    find: function(collection, predicate) {
      if (Array.isArray(collection)) {
        return collection.find(function(item) {
          return predicate(item);
        });
      }
      return undefined;
    },
    merge: function() {
      var result = {};
      for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            result[key] = source[key];
          }
        }
      }
      return result;
    }
  };
  
  // Add missing functions to lodash if they don't exist
  for (var funcName in lodashFunctionsForCharts) {
    if (lodashFunctionsForCharts.hasOwnProperty(funcName) && !window._[funcName]) {
      window._[funcName] = lodashFunctionsForCharts[funcName];
    }
  }
  
  // Ensure window._.each exists as an alias for forEach
  if (!window._.each && window._.forEach) {
    window._.each = window._.forEach;
  }
  
  console.log('Charts-lodash integration fix applied');
})(); 