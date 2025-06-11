// This script must be loaded before any other script
// It creates a global _ variable to prevent Temporal Dead Zone errors

// Create lodash placeholder with essential functions
window._ = {
  // Core functions commonly used early in lodash initialization
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
  
  // Collection functions
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
  
  // Object functions
  get: function(obj, path, defaultValue) {
    if (!obj) return defaultValue;
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    for (let i = 0; i < keys.length; i++) {
      result = result[keys[i]];
      if (result === undefined || result === null) return defaultValue;
    }
    return result;
  },
  has: function(obj, path) {
    if (!obj) return false;
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    for (let i = 0; i < keys.length; i++) {
      if (result === undefined || result === null || !Object.prototype.hasOwnProperty.call(result, keys[i])) {
        return false;
      }
      result = result[keys[i]];
    }
    return true;
  },
  
  // Utility functions
  debounce: function(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  },
  throttle: function(func, wait) {
    let lastCall = 0;
    return function() {
      const now = Date.now();
      if (now - lastCall >= wait) {
        func.apply(this, arguments);
        lastCall = now;
      }
    };
  }
};

// This will help with debugging
console.log("Lodash pre-initialization complete"); 