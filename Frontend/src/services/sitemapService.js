/**
 * wraps public sitemap service calls, api responses, caching, and frontend data helpers
 *
 * @file frontend/src/services/sitemapservice.js
 * @module frontend/src/services/sitemapservice
 * @exports api helpers used by client views
 */

import { apiMethods } from './api';

class SitemapService {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * check if cache is valid
   */
  isCacheValid() {
    if (!this.cache || !this.cacheTime) return false;
    return Date.now() - this.cacheTime < this.CACHE_DURATION;
  }

  /**
   * get profiles sitemap (with caching)
   */
  async getProfilesSitemap() {
    try {
      // return cached data if valid
      if (this.isCacheValid()) {
        console.log('[SitemapService] Serving from memory cache');
        return this.cache;
      }

      console.log('[SitemapService] Fetching fresh sitemap from backend');

      // fetch from backend
      const response = await apiMethods.sitemap.getProfilesSitemap();

      // validate response
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid sitemap response from backend');
      }

      // cache the response
      this.cache = response.data;
      this.cacheTime = Date.now();

      console.log('[SitemapService] Sitemap cached successfully');
      return this.cache;

    } catch (error) {
      console.error('[SitemapService] Error fetching sitemap:', error);

      // return cached data even if expired (fallback)
      if (this.cache) {
        console.warn('[SitemapService] Using stale cache due to error');
        return this.cache;
      }

      throw error;
    }
  }

  /**
   * clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
    console.log('[SitemapService] Cache cleared');
  }
}

// export singleton instance
export default new SitemapService();
