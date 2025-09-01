// src/lib/supabaseCache.js
import { handleSupabaseError } from './supabaseUtils';

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100,
  CACHE_KEY_PREFIX: 'supabase_cache_',
};

// In-memory cache with TTL support
class MemoryCache {
  constructor(maxSize = CACHE_CONFIG.MAX_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.hitCount = 0;
    this.missCount = 0;
  }

  set(key, value, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt, createdAt: Date.now() });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(2) + '%' : '0%',
    };
  }
}

// Global cache instance
const cache = new MemoryCache();

// Cache key generation
function generateCacheKey(table, operation, params = {}) {
  const keyParts = [CACHE_CONFIG.CACHE_KEY_PREFIX, table, operation];
  
  // Sort params for consistent key generation
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {});
  
  if (Object.keys(sortedParams).length > 0) {
    keyParts.push(JSON.stringify(sortedParams));
  }
  
  return keyParts.join(':');
}

// Request deduplication - prevent multiple identical requests
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicate(key, requestFn) {
    // If request is already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const promise = requestFn()
      .finally(() => {
        // Remove from pending requests when done
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear() {
    this.pendingRequests.clear();
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
    };
  }
}

const deduplicator = new RequestDeduplicator();

// Cache strategies
export const CacheStrategy = {
  CACHE_FIRST: 'cache-first', // Return cached data immediately, refresh in background
  CACHE_ONLY: 'cache-only',   // Only return cached data, don't make network request
  NETWORK_FIRST: 'network-first', // Try network first, fallback to cache
  NETWORK_ONLY: 'network-only', // Always make network request, don't use cache
};

// Cached query wrapper
export async function cachedQuery({
  queryFn,
  cacheKey,
  ttl = CACHE_CONFIG.DEFAULT_TTL,
  strategy = CacheStrategy.CACHE_FIRST,
  staleWhileRevalidate = false,
}) {
  const cached = cache.get(cacheKey);
  
  switch (strategy) {
    case CacheStrategy.CACHE_ONLY:
      return cached || null;
      
    case CacheStrategy.NETWORK_ONLY:
      const networkResult = await deduplicator.deduplicate(cacheKey, queryFn);
      cache.set(cacheKey, networkResult, ttl);
      return networkResult;
      
    case CacheStrategy.NETWORK_FIRST:
      try {
        const networkResult = await deduplicator.deduplicate(cacheKey, queryFn);
        cache.set(cacheKey, networkResult, ttl);
        return networkResult;
      } catch (error) {
        if (cached) {
          console.warn('Network request failed, returning cached data:', error);
          return cached;
        }
        throw error;
      }
      
    case CacheStrategy.CACHE_FIRST:
    default:
      if (cached) {
        // If staleWhileRevalidate is enabled, refresh in background
        if (staleWhileRevalidate) {
          deduplicator.deduplicate(`${cacheKey}_refresh`, async () => {
            try {
              const freshData = await queryFn();
              cache.set(cacheKey, freshData, ttl);
            } catch (error) {
              console.warn('Background refresh failed:', error);
            }
          });
        }
        return cached;
      }
      
      // No cached data, fetch from network
      const result = await deduplicator.deduplicate(cacheKey, queryFn);
      cache.set(cacheKey, result, ttl);
      return result;
  }
}

// Supabase-specific cache helpers
export class SupabaseCache {
  // Cache a SELECT query
  static async select({
    query,
    table,
    filters = {},
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    strategy = CacheStrategy.CACHE_FIRST,
  }) {
    const cacheKey = generateCacheKey(table, 'select', filters);
    
    return cachedQuery({
      queryFn: async () => {
        const result = await query;
        if (result.error) throw result.error;
        return result.data;
      },
      cacheKey,
      ttl,
      strategy,
      staleWhileRevalidate: true,
    });
  }

  // Cache a single record query
  static async selectSingle({
    query,
    table,
    id,
    ttl = CACHE_CONFIG.DEFAULT_TTL,
    strategy = CacheStrategy.CACHE_FIRST,
  }) {
    const cacheKey = generateCacheKey(table, 'select_single', { id });
    
    return cachedQuery({
      queryFn: async () => {
        const result = await query;
        if (result.error) throw result.error;
        return result.data;
      },
      cacheKey,
      ttl,
      strategy,
    });
  }

  // Invalidate cache for specific patterns
  static invalidate(pattern) {
    return cache.invalidatePattern(pattern);
  }

  // Invalidate all cache entries for a table
  static invalidateTable(table) {
    const pattern = `${CACHE_CONFIG.CACHE_KEY_PREFIX}${table}:`;
    return cache.invalidatePattern(pattern);
  }

  // Clear all cache
  static clearAll() {
    cache.clear();
    deduplicator.clear();
  }

  // Get cache statistics
  static getStats() {
    return {
      cache: cache.getStats(),
      deduplicator: deduplicator.getStats(),
    };
  }

  // Warm up cache with commonly accessed data
  static async warmUp(warmUpQueries = []) {
    const promises = warmUpQueries.map(async ({ queryFn, cacheKey, ttl }) => {
      try {
        const result = await queryFn();
        cache.set(cacheKey, result, ttl);
      } catch (error) {
        console.warn(`Cache warm-up failed for ${cacheKey}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }
}

// Optimistic update helpers
export class OptimisticUpdates {
  // Optimistically update a single record
  static updateRecord(table, id, updates) {
    const cacheKey = generateCacheKey(table, 'select_single', { id });
    const cached = cache.get(cacheKey);
    
    if (cached) {
      const optimistic = { ...cached, ...updates };
      cache.set(cacheKey, optimistic, CACHE_CONFIG.DEFAULT_TTL);
      return optimistic;
    }
    
    return null;
  }

  // Optimistically add a record to a list
  static addToList(table, filters, newRecord) {
    const cacheKey = generateCacheKey(table, 'select', filters);
    const cached = cache.get(cacheKey);
    
    if (cached && Array.isArray(cached)) {
      const optimistic = [newRecord, ...cached];
      cache.set(cacheKey, optimistic, CACHE_CONFIG.DEFAULT_TTL);
      return optimistic;
    }
    
    return null;
  }

  // Optimistically remove a record from a list
  static removeFromList(table, filters, recordId) {
    const cacheKey = generateCacheKey(table, 'select', filters);
    const cached = cache.get(cacheKey);
    
    if (cached && Array.isArray(cached)) {
      const optimistic = cached.filter(item => item.id !== recordId);
      cache.set(cacheKey, optimistic, CACHE_CONFIG.DEFAULT_TTL);
      return optimistic;
    }
    
    return null;
  }
}

// React hook for cache management
export function useCacheManagement() {
  return {
    invalidateTable: SupabaseCache.invalidateTable,
    invalidatePattern: SupabaseCache.invalidate,
    clearAll: SupabaseCache.clearAll,
    getStats: SupabaseCache.getStats,
    warmUp: SupabaseCache.warmUp,
  };
}

// Export the cache instance for direct access
export { cache, deduplicator };