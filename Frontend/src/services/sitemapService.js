import { apiMethods } from './api';

class SitemapService {
  constructor() {
    this.cache = null;
    this.cacheTime = null;
    this.CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    if (!this.cache || !this.cacheTime) return false;
    return Date.now() - this.cacheTime < this.CACHE_DURATION;
  }

  /**
   * Get profiles sitemap (with caching)
   */
  async getProfilesSitemap() {
    try {
      // Return cached data if valid
      if (this.isCacheValid()) {
        console.log('[SitemapService] Serving from memory cache');
        return this.cache;
      }

      console.log('[SitemapService] Fetching fresh sitemap from backend');
      
      // Fetch from backend
      const response = await apiMethods.sitemap.getProfilesSitemap();
      
      // Validate response
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Invalid sitemap response from backend');
      }

      // Cache the response
      this.cache = response.data;
      this.cacheTime = Date.now();

      console.log('[SitemapService] Sitemap cached successfully');
      return this.cache;

    } catch (error) {
      console.error('[SitemapService] Error fetching sitemap:', error);
      
      // Return cached data even if expired (fallback)
      if (this.cache) {
        console.warn('[SitemapService] Using stale cache due to error');
        return this.cache;
      }

      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
    console.log('[SitemapService] Cache cleared');
  }
}

// Export singleton instance
export default new SitemapService();