/**
 * Cache utility for database queries to reduce database load
 * and improve performance.
 */

// Map to store cached query results
type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

type CacheOptions = {
  ttl?: number; // Time to live in milliseconds
  staleTime?: number; // Time before cache is considered stale
  tags?: string[]; // Tags for invalidation groups
};

// In-memory cache
const queryCache = new Map<string, CacheEntry<any>>();
const tagToKeysMap = new Map<string, Set<string>>();

// Default cache options
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute

/**
 * Set data in the cache
 */
export function setCacheData<T>(key: string, data: T, options: CacheOptions = {}): void {
  const ttl = options.ttl ?? DEFAULT_TTL;
  const now = Date.now();
  
  const cacheEntry: CacheEntry<T> = {
    data,
    timestamp: now,
    expiresAt: now + ttl
  };
  
  queryCache.set(key, cacheEntry);
  
  // Associate key with tags for group invalidation
  if (options.tags && options.tags.length > 0) {
    options.tags.forEach(tag => {
      if (!tagToKeysMap.has(tag)) {
        tagToKeysMap.set(tag, new Set());
      }
      
      tagToKeysMap.get(tag)?.add(key);
    });
  }
}

/**
 * Get data from cache, or undefined if not found or expired
 */
export function getCacheData<T>(key: string): T | undefined {
  const entry = queryCache.get(key) as CacheEntry<T> | undefined;
  
  if (!entry) {
    return undefined;
  }
  
  // Check if cache entry has expired
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return undefined;
  }
  
  return entry.data;
}

/**
 * Check if cache data exists and is not stale
 */
export function isCacheFresh(key: string, staleTime = DEFAULT_STALE_TIME): boolean {
  const entry = queryCache.get(key);
  
  if (!entry) {
    return false;
  }
  
  // Check if cache has expired
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return false;
  }
  
  // Check if cache is stale
  return (Date.now() - entry.timestamp) <= staleTime;
}

/**
 * Remove specific key from cache
 */
export function invalidateCache(key: string): void {
  queryCache.delete(key);
}

/**
 * Invalidate all cache entries with a specific tag
 */
export function invalidateCacheByTag(tag: string): void {
  const keys = tagToKeysMap.get(tag);
  
  if (keys) {
    keys.forEach(key => {
      queryCache.delete(key);
    });
    
    tagToKeysMap.delete(tag);
  }
}

/**
 * Clear all cache data
 */
export function clearCache(): void {
  queryCache.clear();
  tagToKeysMap.clear();
}

/**
 * Get a function that will execute and cache a query
 */
export function createCachedQuery<T, Args extends any[]>(
  queryFn: (...args: Args) => Promise<T>,
  keyGenerator: (...args: Args) => string,
  options: CacheOptions = {}
) {
  return async (...args: Args): Promise<T> => {
    const cacheKey = keyGenerator(...args);
    
    // Check cache first
    const cachedData = getCacheData<T>(cacheKey);
    if (cachedData !== undefined) {
      return cachedData;
    }
    
    // Execute query
    const data = await queryFn(...args);
    
    // Cache the result
    setCacheData(cacheKey, data, options);
    
    return data;
  };
}

/**
 * Higher-order function that caches the result of a database query
 */
export function withCache<T>(
  operation: () => Promise<T>,
  cacheKey: string,
  options: CacheOptions = {}
): Promise<T> {
  // Check cache first
  const cachedData = getCacheData<T>(cacheKey);
  
  if (cachedData !== undefined) {
    return Promise.resolve(cachedData);
  }
  
  // Execute the operation
  return operation().then(result => {
    // Cache the result
    setCacheData(cacheKey, result, options);
    return result;
  });
} 