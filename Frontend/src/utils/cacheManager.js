// src/utils/cacheManager.js
/**
 * Cache Manager for API responses and images
 * Uses IndexedDB for structured data caching
 * Implements 24-hour TTL and version-based invalidation
 */

const DB_NAME = "AppCache";
const DB_VERSION = 1;
const STORES = {
  API_CACHE: "apiCache",
  IMAGE_CACHE: "imageCache",
  METADATA: "metadata",
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class CacheManager {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  /**
   * Initialize IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[Cache] Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // API Cache Store
        if (!db.objectStoreNames.contains(STORES.API_CACHE)) {
          const apiStore = db.createObjectStore(STORES.API_CACHE, {
            keyPath: "key",
          });
          apiStore.createIndex("timestamp", "timestamp", { unique: false });
          apiStore.createIndex("endpoint", "endpoint", { unique: false });
        }

        // Image Cache Store
        if (!db.objectStoreNames.contains(STORES.IMAGE_CACHE)) {
          const imageStore = db.createObjectStore(STORES.IMAGE_CACHE, {
            keyPath: "url",
          });
          imageStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Metadata Store (for versioning)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Generate cache key from endpoint and params
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Check if cache entry is still valid
   */
  isValid(timestamp, maxAge = CACHE_DURATION) {
    return Date.now() - timestamp < maxAge;
  }

  /**
   * Get cached API response
   */
  async getAPI(endpoint, params = {}) {
    try {
      await this.initPromise;
      const key = this.generateKey(endpoint, params);

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORES.API_CACHE], "readonly");
        const store = transaction.objectStore(STORES.API_CACHE);
        const request = store.get(key);

        request.onsuccess = () => {
          const cached = request.result;

          if (!cached) {
            resolve(null);
            return;
          }

          if (!this.isValid(cached.timestamp)) {
            this.deleteAPI(key); // Clean up expired entry
            resolve(null);
            return;
          }

          //   console.log(`[Cache] Hit for ${endpoint} (age: ${Math.round((Date.now() - cached.timestamp) / 1000 / 60)}m)`);
          resolve(cached.data);
        };

        request.onerror = () => {
          //   console.error(request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      //   console.error(error);
      return null;
    }
  }

  /**
   * Set cached API response
   */
  async setAPI(endpoint, params = {}, data) {
    try {
      await this.initPromise;
      const key = this.generateKey(endpoint, params);

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          [STORES.API_CACHE],
          "readwrite"
        );
        const store = transaction.objectStore(STORES.API_CACHE);

        const cacheEntry = {
          key,
          endpoint,
          params,
          data,
          timestamp: Date.now(),
        };

        const request = store.put(cacheEntry);

        request.onsuccess = () => {
          //   console.log(`[Cache] Stored ${endpoint}`);
          resolve();
        };

        request.onerror = () => {
          //   console.error(request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      //   console.error( error);
    }
  }

  /**
   * Delete specific API cache entry
   */
  async deleteAPI(key) {
    try {
      await this.initPromise;
      const transaction = this.db.transaction([STORES.API_CACHE], "readwrite");
      const store = transaction.objectStore(STORES.API_CACHE);
      store.delete(key);
    } catch (error) {
      //   console.error(error);
    }
  }

  /**
   * Clear all API cache for an endpoint pattern
   */
  async clearAPIByEndpoint(endpointPattern) {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          [STORES.API_CACHE],
          "readwrite"
        );
        const store = transaction.objectStore(STORES.API_CACHE);
        const index = store.index("endpoint");
        const request = index.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.endpoint.includes(endpointPattern)) {
              cursor.delete();
              //   console.log(`[Cache] Cleared ${cursor.value.endpoint}`);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      //   console.error(error);
    }
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpired() {
    try {
      await this.initPromise;
      let cleared = 0;

      return new Promise((resolve) => {
        const transaction = this.db.transaction(
          [STORES.API_CACHE],
          "readwrite"
        );
        const store = transaction.objectStore(STORES.API_CACHE);
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (!this.isValid(cursor.value.timestamp)) {
              cursor.delete();
              cleared++;
            }
            cursor.continue();
          } else {
            if (cleared > 0) {
              //   console.log(`[Cache] Cleared ${cleared} expired entries`);
            }
            resolve(cleared);
          }
        };
      });
    } catch (error) {
      //   console.error(error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      await this.initPromise;

      const transaction = this.db.transaction(
        [STORES.API_CACHE, STORES.IMAGE_CACHE],
        "readwrite"
      );

      await Promise.all([
        transaction.objectStore(STORES.API_CACHE).clear(),
        transaction.objectStore(STORES.IMAGE_CACHE).clear(),
      ]);

      //   console.log('[Cache] All cache cleared');
    } catch (error) {
      //   console.error(error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      await this.initPromise;

      return new Promise((resolve) => {
        const transaction = this.db.transaction([STORES.API_CACHE], "readonly");
        const store = transaction.objectStore(STORES.API_CACHE);
        const countRequest = store.count();

        countRequest.onsuccess = () => {
          const total = countRequest.result;
          const cursorRequest = store.openCursor();
          let valid = 0;
          let expired = 0;

          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              if (this.isValid(cursor.value.timestamp)) {
                valid++;
              } else {
                expired++;
              }
              cursor.continue();
            } else {
              resolve({ total, valid, expired });
            }
          };
        };
      });
    } catch (error) {
      //   console.error(error);
      return { total: 0, valid: 0, expired: 0 };
    }
  }

  /**
   * Cache image by URL
   */
  async cacheImage(url) {
    try {
      if (!url) return false;

      // Check if already cached
      const cached = await this.getImage(url);
      if (cached) {
        // console.log('[Cache] Image already cached:', url);
        return true;
      }

      // Fetch and cache the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();

      await this.setImage(url, blob);
      // console.log('[Cache] Image cached:', url);
      return true;
    } catch (error) {
      console.error("[Cache] Failed to cache image:", url, error);
      return false;
    }
  }

  /**
   * Get cached image
   */
  async getImage(url) {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          [STORES.IMAGE_CACHE],
          "readonly"
        );
        const store = transaction.objectStore(STORES.IMAGE_CACHE);
        const request = store.get(url);

        request.onsuccess = () => {
          const cached = request.result;

          if (!cached) {
            resolve(null);
            return;
          }

          if (!this.isValid(cached.timestamp)) {
            this.deleteImage(url);
            resolve(null);
            return;
          }

          resolve(cached.blob);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Set cached image
   */
  async setImage(url, blob) {
    try {
      await this.initPromise;

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(
          [STORES.IMAGE_CACHE],
          "readwrite"
        );
        const store = transaction.objectStore(STORES.IMAGE_CACHE);

        const cacheEntry = {
          url,
          blob,
          timestamp: Date.now(),
        };

        const request = store.put(cacheEntry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[Cache] Failed to set image:", error);
    }
  }

  /**
   * Delete specific image cache entry
   */
  async deleteImage(url) {
    try {
      await this.initPromise;
      const transaction = this.db.transaction(
        [STORES.IMAGE_CACHE],
        "readwrite"
      );
      const store = transaction.objectStore(STORES.IMAGE_CACHE);
      store.delete(url);
    } catch (error) {
      console.error("[Cache] Failed to delete image:", error);
    }
  }

  /**
   * Preload multiple images
   */
  async preloadImages(urls) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    const validUrls = urls.filter((url) => url && typeof url === "string");

    const results = await Promise.allSettled(
      validUrls.map((url) => this.cacheImage(url))
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    // console.log(`[Cache] Preloaded ${successful}/${validUrls.length} images`);

    return successful;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Utility function to wrap API calls with caching
export async function cachedAPICall(
  endpoint,
  params,
  fetchFunction,
  options = {}
) {
  const {
    maxAge = CACHE_DURATION,
    forceRefresh = false,
    skipCache = false,
  } = options;

  // Skip cache if requested
  if (skipCache) {
    const data = await fetchFunction();
    return data;
  }

  // Check cache first
  if (!forceRefresh) {
    const cached = await cacheManager.getAPI(endpoint, params);
    if (cached) {
      return cached;
    }
  }

  // Fetch fresh data
  try {
    const data = await fetchFunction();

    // Cache the result
    await cacheManager.setAPI(endpoint, params, data);

    return data;
  } catch (error) {
    // If fetch fails, try to return stale cache as fallback
    const stale = await cacheManager.getAPI(endpoint, params);
    if (stale) {
      //   console.log(`[Cache] Using stale cache for ${endpoint} due to fetch error`);
      return stale;
    }
    throw error;
  }
}
