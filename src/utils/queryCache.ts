import { DatabaseRow } from './db';

interface CacheEntry {
  data: DatabaseRow[];
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  prefix?: string; // Optional prefix for cache keys
}

/**
 * Simple in-memory cache for database queries
 * For production use, consider using Redis or another shared cache solution
 */
class QueryCache {
  private cache: Map<string, CacheEntry>;
  private defaultTtl: number;
  private prefix: string;
  private maxEntries: number;
  private enabled: boolean;
  
  constructor() {
    this.cache = new Map();
    this.defaultTtl = 5 * 60 * 1000; // 5 minutes
    this.prefix = 'db:';
    this.maxEntries = 1000; // Prevent memory leaks
    this.enabled = process.env.NODE_ENV !== 'test'; // Disable in test environment
    
    // Set up periodic cache cleanup
    setInterval(() => this.cleanup(), 60 * 1000); // Run cleanup every minute
  }
  
  /**
   * Generate a cache key from the query and parameters
   */
  private generateKey(query: string, params: any[] = []): string {
    return this.prefix + JSON.stringify({ query, params });
  }
  
  /**
   * Get data from cache
   */
  get(query: string, params: any[] = []): DatabaseRow[] | null {
    if (!this.enabled) return null;
    
    const key = this.generateKey(query, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Store data in cache
   */
  set(query: string, params: any[] = [], data: DatabaseRow[], options: CacheOptions = {}): void {
    if (!this.enabled) return;
    
    // Don't cache empty results
    if (!data || data.length === 0) return;
    
    // Don't cache mutation queries (INSERT, UPDATE, DELETE)
    if (/^\s*(INSERT|UPDATE|DELETE)/i.test(query)) return;
    
    const key = this.generateKey(query, params);
    const ttl = options.ttl || this.defaultTtl;
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
    
    // Enforce the maximum cache size
    if (this.cache.size > this.maxEntries) {
      this.prune();
    }
  }
  
  /**
   * Invalidate a specific cache entry
   */
  invalidate(query: string, params: any[] = []): void {
    const key = this.generateKey(query, params);
    this.cache.delete(key);
  }
  
  /**
   * Invalidate all cache entries with a given prefix
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(this.prefix + prefix)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Remove expired entries from the cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Prune the cache when it exceeds the maximum size
   * Remove the oldest entries first
   */
  private prune(): void {
    // Sort entries by timestamp
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove the oldest entries until we're below the maximum
    const entriesToRemove = this.cache.size - this.maxEntries;
    for (let i = 0; i < entriesToRemove; i++) {
      if (entries[i]) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Get statistics about the cache
   */
  getStats(): { size: number; maxEntries: number; enabled: boolean } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      enabled: this.enabled
    };
  }
  
  /**
   * Enable or disable the cache
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }
}

// Export a singleton instance
export const queryCache = new QueryCache();

export default queryCache; 