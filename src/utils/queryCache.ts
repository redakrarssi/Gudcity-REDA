/**
 * A lightweight memory cache for query results to reduce database load
 * and improve performance. This cache is separate from React Query's
 * cache and can be used for raw SQL query results.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Tags for group invalidation
}

// Memory cache store
const cache = new Map<string, CacheEntry<any>>();
const taggedKeys = new Map<string, Set<string>>();

// Default TTL is 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get a value from the cache
 * @param key Cache key
 * @returns The cached value or undefined if not found or expired
 */
export function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  
  if (!entry) {
    return undefined;
  }
  
  // Check if entry has expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  
  return entry.data as T;
}

/**
 * Store a value in the cache
 * @param key Cache key
 * @param data Data to cache
 * @param options Cache options
 */
export function setInCache<T>(key: string, data: T, options: CacheOptions = {}): void {
  const ttl = options.ttl || DEFAULT_TTL;
  const now = Date.now();
  
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttl
  });
  
  // Associate key with tags if provided
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach(tag => {
      if (!taggedKeys.has(tag)) {
        taggedKeys.set(tag, new Set());
      }
      
      taggedKeys.get(tag)?.add(key);
    });
  }
}

/**
 * Invalidate a specific key in the cache
 * @param key Cache key to invalidate
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries with a given tag
 * @param tag Tag to invalidate
 */
export function invalidateCacheByTag(tag: string): void {
  const keys = taggedKeys.get(tag);
  
  if (keys) {
    keys.forEach(key => {
      cache.delete(key);
    });
    
    // Clear the tag entry
    taggedKeys.delete(tag);
  }
}

/**
 * Check if a key exists in the cache and is not expired
 * @param key Cache key to check
 * @returns True if the key exists and is not expired
 */
export function isCached(key: string): boolean {
  const entry = cache.get(key);
  
  if (!entry) {
    return false;
  }
  
  // Check if entry has expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Get the timestamp when a cache entry was created
 * @param key Cache key
 * @returns Timestamp or undefined if not found
 */
export function getCacheTimestamp(key: string): number | undefined {
  return cache.get(key)?.timestamp;
}

/**
 * Get cache statistics
 * @returns Object with cache stats
 */
export function getCacheStats() {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;
  
  cache.forEach(entry => {
    if (now <= entry.expiresAt) {
      activeEntries++;
    } else {
      expiredEntries++;
    }
  });
  
  return {
    size: cache.size,
    activeEntries,
    expiredEntries,
    tagCount: taggedKeys.size
  };
}

/**
 * Clear all expired entries from the cache
 * @returns Number of entries removed
 */
export function pruneExpiredEntries(): number {
  const now = Date.now();
  let removedCount = 0;
  
  cache.forEach((entry, key) => {
    if (now > entry.expiresAt) {
      cache.delete(key);
      removedCount++;
    }
  });
  
  return removedCount;
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear();
  taggedKeys.clear();
}

// Export the full cache object for direct manipulation if needed
export const queryCache = {
  get: getFromCache,
  set: setInCache,
  invalidate: invalidateCache,
  invalidateByTag: invalidateCacheByTag,
  isCached,
  getTimestamp: getCacheTimestamp,
  getStats: getCacheStats,
  prune: pruneExpiredEntries,
  clear: clearCache
}; 