/**
 * CRITICAL FIX: Ensures Lodash is available for charts library
 * This must be loaded BEFORE any chart components
 */
(function() {
  console.log('Charts emergency fix initializing...');
  
  // Make sure Lodash exists globally
  if (!window._) {
    console.error('Lodash not found! Creating emergency implementation.');
    window._ = {
      noop: function() { return undefined; },
      identity: function(val) { return val; },
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
        var current = obj;
        var pathArray = Array.isArray(path) ? path : String(path).split('.');
        for (var i = 0; i < pathArray.length; i++) {
          if (current === null || current === undefined) return defaultValue;
          current = current[pathArray[i]];
        }
        return current === undefined ? defaultValue : current;
      }
    };
  }
  
  // Fix array methods that charts might use
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
      if (this == null) throw new TypeError('Array.prototype.find called on null or undefined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      for (var i = 0; i < length; i++) {
        var value = list[i];
        if (predicate.call(thisArg, value, i, list)) return value;
      }
      return undefined;
    };
  }
  
  // Intercept module loading to ensure order
  var originalDefine = window.define;
  if (typeof originalDefine === 'function' && originalDefine.amd) {
    window.define = function(name, deps, callback) {
      // For chart modules, make sure _ is explicitly available
      if (typeof name === 'string' && 
          (name.includes('chart') || name.includes('recharts') || name.includes('d3'))) {
        console.log('Intercepted chart module:', name);
        if (Array.isArray(deps)) {
          if (!deps.includes('lodash') && !deps.includes('_')) {
            deps.unshift('_');
          }
        }
      }
      return originalDefine.apply(this, arguments);
    };
    window.define.amd = originalDefine.amd;
  }
  
  console.log('Charts emergency fix complete - Lodash available:', typeof window._ === 'object');
})();

// Polyfill for charts compatibility
console.log('charts-fix-latest.js loaded'); 