/**
 * provides public cache manager utilities for secure requests, validation, caching, and shared helpers
 *
 * @file frontend/src/utils/cachemanager.js
 * @module frontend/src/utils/cachemanager
 * @exports helpers imported by related app modules
 */

// src/utils/cachemanager.js
/**
 * cache manager for api responses and images
 * uses indexeddb for structured data caching
 * implements 24-hour ttl and version-based invalidation
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
   * initialize indexeddb
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

        // api cache store
        if (!db.objectStoreNames.contains(STORES.API_CACHE)) {
          const apiStore = db.createObjectStore(STORES.API_CACHE, {
            keyPath: "key",
          });
          apiStore.createIndex("timestamp", "timestamp", { unique: false });
          apiStore.createIndex("endpoint", "endpoint", { unique: false });
        }

        // image cache store
        if (!db.objectStoreNames.contains(STORES.IMAGE_CACHE)) {
          const imageStore = db.createObjectStore(STORES.IMAGE_CACHE, {
            keyPath: "url",
          });
          imageStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // metadata store (for versioning)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * generate cache key from endpoint and params
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
   * check if cache entry is still valid
   */
  isValid(timestamp, maxAge = CACHE_DURATION) {
    return Date.now() - timestamp < maxAge;
  }

  /**
   * get cached api response
   */
  async getAPI(endpoint, params = {}, maxAge = CACHE_DURATION) {
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

          if (!this.isValid(cached.timestamp, maxAge)) {
            this.deleteAPI(key); // clean up expired entry
            resolve(null);
            return;
          }

          // console.log(`[cache] hit for ${endpoint} (age: ${math.round((date.now() - cached.timestamp) / 1000 / 60)}m)`);
          resolve(cached.data);
        };

        request.onerror = () => {
          // console.error(request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // console.error(error);
      return null;
    }
  }

  /**
   * set cached api response
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
          // console.log(`[cache] stored ${endpoint}`);
          resolve();
        };

        request.onerror = () => {
          // console.error(request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // console.error( error);
    }
  }

  /**
   * delete specific api cache entry
   */
  async deleteAPI(key) {
    try {
      await this.initPromise;
      const transaction = this.db.transaction([STORES.API_CACHE], "readwrite");
      const store = transaction.objectStore(STORES.API_CACHE);
      store.delete(key);
    } catch (error) {
      // console.error(error);
    }
  }

  /**
   * clear all api cache for an endpoint pattern
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
              // console.log(`[cache] cleared ${cursor.value.endpoint}`);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      // console.error(error);
    }
  }

  /**
   * clear all expired cache entries
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
              // console.log(`[cache] cleared ${cleared} expired entries`);
            }
            resolve(cleared);
          }
        };
      });
    } catch (error) {
      // console.error(error);
      return 0;
    }
  }

  /**
   * clear all cache
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

      // console.log('[cache] all cache cleared');
    } catch (error) {
      // console.error(error);
    }
  }

  /**
   * get cache statistics
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
      // console.error(error);
      return { total: 0, valid: 0, expired: 0 };
    }
  }

  /**
   * cache image by url
   */
  async cacheImage(url) {
    try {
      if (!url) return false;

      // check if already cached
      const cached = await this.getImage(url);
      if (cached) {
        // console.log('[cache] image already cached:', url);
        return true;
      }

      // fetch and cache the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();

      await this.setImage(url, blob);
      // console.log('[cache] image cached:', url);
      return true;
    } catch (error) {
      console.error("[Cache] Failed to cache image:", url, error);
      return false;
    }
  }

  /**
   * get cached image
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
   * set cached image
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
   * delete specific image cache entry
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
   * preload multiple images
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
    // console.log(`[cache] preloaded ${successful}/${validurls.length} images`);

    return successful;
  }
}

// export singleton instance
export const cacheManager = new CacheManager();

// utility function to wrap api calls with caching
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

  // skip cache if requested
  if (skipCache) {
    const data = await fetchFunction();
    return data;
  }

  // check cache first
  if (!forceRefresh) {
    const cached = await cacheManager.getAPI(endpoint, params, maxAge);
    if (cached) {
      return cached;
    }
  }

  // fetch fresh data
  try {
    const data = await fetchFunction();

    // cache the result
    await cacheManager.setAPI(endpoint, params, data);

    return data;
  } catch (error) {
    // if fetch fails, try to return stale cache as fallback
    const stale = await cacheManager.getAPI(endpoint, params, maxAge);
    if (stale) {
      // console.log(`[cache] using stale cache for ${endpoint} due to fetch error`);
      return stale;
    }
    throw error;
  }
}
