/**
 * Pre-initializes lodash to prevent "Cannot access '_' before initialization" error
 * This file should be imported at the very beginning of the main entry point
 */

// Define types for our minimal lodash implementation
interface LodashMini {
  noop: () => void;
  identity: <T>(value: T) => T;
  isObject: (obj: any) => boolean;
  isFunction: (f: any) => boolean;
  isArray: (arr: any) => boolean;
  forEach: <T>(collection: T[] | Record<string, T>, iteratee: (value: T, key: string | number, collection: T[] | Record<string, T>) => void) => T[] | Record<string, T>;
  map: <T, R>(collection: T[] | Record<string, T>, iteratee: (value: T, key: string | number, collection: T[] | Record<string, T>) => R) => R[];
  get: (obj: any, path: string | string[], defaultValue?: any) => any;
  find: <T>(collection: T[] | Record<string, T>, predicate: (value: T, key: string | number, collection: T[] | Record<string, T>) => boolean) => T | undefined;
  pick: (object: Record<string, any>, ...paths: (string | string[])[]) => Record<string, any>;
}

// Extend the Window interface
declare global {
  interface Window {
    _: LodashMini;
  }
}

// Create a minimal implementation of the lodash utility functions
// needed by chart libraries before the real lodash is loaded
// This prevents the "Cannot access '_' before initialization" error
window._ = window._ || {
  noop: function() {},
  identity: function<T>(value: T): T { return value; },
  isObject: function(obj: any): boolean { return obj !== null && typeof obj === 'object'; },
  isFunction: function(f: any): boolean { return typeof f === 'function'; },
  isArray: Array.isArray,
  forEach: function<T>(collection: T[] | Record<string, T>, iteratee: (value: T, key: string | number, collection: T[] | Record<string, T>) => void): T[] | Record<string, T> {
    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) iteratee(collection[i], i, collection);
    } else if (collection && typeof collection === 'object') {
      for (let key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          iteratee(collection[key], key, collection as Record<string, T>);
        }
      }
    }
    return collection;
  },
  map: function<T, R>(collection: T[] | Record<string, T>, iteratee: (value: T, key: string | number, collection: T[] | Record<string, T>) => R): R[] {
    const result: R[] = [];
    if (Array.isArray(collection)) {
      for (let i = 0; i < collection.length; i++) result.push(iteratee(collection[i], i, collection));
    } else if (collection && typeof collection === 'object') {
      for (let key in collection) {
        if (Object.prototype.hasOwnProperty.call(collection, key)) {
          result.push(iteratee(collection[key], key, collection as Record<string, T>));
        }
      }
    }
    return result;
  },
  get: function(obj: any, path: string | string[], defaultValue?: any): any {
    if (!obj) return defaultValue;
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let result = obj;
    for (const key of pathArray) {
      if (result === null || result === undefined) return defaultValue;
      result = result[key];
    }
    return result === undefined ? defaultValue : result;
  },
  find: function<T>(collection: T[] | Record<string, T>, predicate: (value: T, key: string | number, collection: T[] | Record<string, T>) => boolean): T | undefined {
    if (Array.isArray(collection)) {
      return collection.find(predicate as (value: T, index: number, obj: T[]) => boolean);
    }
    const key = Object.keys(collection || {}).find(k => predicate(collection[k], k, collection as Record<string, T>));
    return key !== undefined ? collection[key] : undefined;
  },
  pick: function(object: Record<string, any>, ...paths: (string | string[])[]): Record<string, any> {
    const result: Record<string, any> = {};
    if (!object) return result;
    const props = paths.flat();
    props.forEach(key => {
      if (key in object) result[key] = object[key];
    });
    return result;
  }
};

// Export for TypeScript
export default window._; 