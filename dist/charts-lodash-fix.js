// Special fix for charts vendor script
// This script ensures that the lodash library is properly initialized
// before any chart-related code tries to access it

(function() {
  // Define these functions directly on the global _ object
  // These are the specific functions used by charts libraries
  const _ = window._ = window._ || {};

  // Core functions
  _.forEach = _.each = function(collection, iteratee) {
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
  };

  // Object manipulation
  _.assign = _.extend = Object.assign;
  _.pick = function(object, ...paths) {
    const result = {};
    if (object == null) return result;
    const props = [].concat(...paths.map(p => Array.isArray(p) ? p : [p]));
    props.forEach(key => {
      if (key in object) result[key] = object[key];
    });
    return result;
  };
  
  // Array functions
  _.map = function(collection, iteratee) {
    if (Array.isArray(collection)) {
      return collection.map(iteratee);
    }
    const result = [];
    for (const key in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, key)) {
        result.push(iteratee(collection[key], key, collection));
      }
    }
    return result;
  };
  _.filter = function(collection, predicate) {
    return Array.isArray(collection) ? collection.filter(predicate) : 
      Object.keys(collection).filter(key => predicate(collection[key], key, collection))
        .map(key => collection[key]);
  };
  _.find = function(collection, predicate) {
    if (Array.isArray(collection)) {
      return collection.find(predicate);
    }
    const key = Object.keys(collection).find(key => predicate(collection[key], key, collection));
    return key !== undefined ? collection[key] : undefined;
  };
  _.findIndex = function(array, predicate) {
    return Array.isArray(array) ? array.findIndex(predicate) : -1;
  };
  
  // More chart-specific functions
  _.sortBy = function(collection, iteratee) {
    const isFunction = typeof iteratee === 'function';
    const isString = typeof iteratee === 'string';
    
    return [].concat(collection).sort((a, b) => {
      const valA = isFunction ? iteratee(a) : isString ? a[iteratee] : a;
      const valB = isFunction ? iteratee(b) : isString ? b[iteratee] : b;
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    });
  };
  
  // Mathematical functions often used in charts
  _.sum = function(array) {
    return array.reduce((sum, n) => sum + n, 0);
  };
  _.max = function(array) {
    return array.length ? Math.max(...array) : undefined;
  };
  _.min = function(array) {
    return array.length ? Math.min(...array) : undefined;
  };
  
  // Common utility
  _.identity = function(value) { return value; };
  _.isFunction = function(value) { return typeof value === 'function'; };
  _.isArray = Array.isArray;
  _.isObject = function(value) { return value !== null && typeof value === 'object'; };
  _.isNumber = function(value) { return typeof value === 'number' && !isNaN(value); };
  _.isString = function(value) { return typeof value === 'string'; };
  _.isUndefined = function(value) { return value === undefined; };
  
  console.log("Charts Lodash compatibility layer loaded");
})(); 