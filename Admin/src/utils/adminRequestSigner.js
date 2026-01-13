import crypto from "crypto-js";

/**
 * Admin Request Signer
 * Handles HMAC-SHA256 signing for admin panel API requests
 *
 * Security Features:
 * - Separate signing secret from user frontend
 * - HMAC-SHA256 signatures
 * - Nonce for replay protection
 * - Timestamp validation (5min window)
 *
 * @class AdminRequestSigner
 */
class AdminRequestSigner {
  constructor() {
    this.signingSecret = null;
    this.secretExpiry = null;
  }

  /**
   * Set signing secret and expiration time
   *
   * @param {string} secret - HMAC secret key
   * @param {number} expiresIn - Expiration time in seconds
   */
  setSigningSecret(secret, expiresIn) {
    this.signingSecret = secret;
    this.secretExpiry = Date.now() + expiresIn * 1000;

    localStorage.setItem("admin_signing_secret", secret);
    localStorage.setItem(
      "admin_signing_secret_expiry",
      this.secretExpiry.toString()
    );
  }

  /**
   * Load signing secret from localStorage
   *
   * @returns {boolean} True if valid secret loaded, false otherwise
   */
  loadSigningSecret() {
    const secret = localStorage.getItem("admin_signing_secret");
    const expiry = localStorage.getItem("admin_signing_secret_expiry");

    if (secret && expiry && Date.now() < parseInt(expiry)) {
      this.signingSecret = secret;
      this.secretExpiry = parseInt(expiry);
      return true;
    }

    return false;
  }

  /**
   * Clear signing secret from memory and storage
   */
  clearSigningSecret() {
    this.signingSecret = null;
    this.secretExpiry = null;
    localStorage.removeItem("admin_signing_secret");
    localStorage.removeItem("admin_signing_secret_expiry");
  }

  /**
   * Check if signing secret is still valid
   *
   * @returns {boolean} True if secret exists and not expired
   */
  isSecretValid() {
    return this.signingSecret && Date.now() < this.secretExpiry;
  }

  /**
   * Generate cryptographically secure random nonce
   *
   * @returns {string} 16-byte hex nonce
   */
  generateNonce() {
    // Use Web Crypto API for cryptographically strong randomness
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    // Convert to hex string (32 characters)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Generate HMAC-SHA256 signature for request
   *
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - Request path
   * @param {Object} body - Request body
   * @param {string} timestamp - Request timestamp
   * @param {string} nonce - Request nonce
   * @returns {string} HMAC-SHA256 signature
   * @throws {Error} If signing secret not available
   */
  generateSignature(method, path, body, timestamp, nonce) {
    if (!this.signingSecret) {
      throw new Error("Admin signing secret not available");
    }

    const bodyString =
      body && Object.keys(body).length > 0 ? JSON.stringify(body) : "";

    const payload = `${timestamp}:${nonce}:${method}:${path}:${bodyString}`;

    return crypto.HmacSHA256(payload, this.signingSecret).toString();
  }

  /**
   * Sign axios request config with HMAC-SHA256 signature
   *
   * CRITICAL PATH CONSTRUCTION LOGIC:
   * Backend uses req.path which includes the full API path.
   *
   * Examples:
   * - Axios config.url = "/content/settings"
   * - Axios config.baseURL = "http://localhost:7000/api"
   * - Backend req.path = "/api/content/settings"
   *
   * Therefore, we must reconstruct the FULL path including /api prefix
   * to match what the backend verification middleware sees.
   *
   * @param {Object} config - Axios request configuration object
   * @param {string} config.url - Relative or absolute request URL
   * @param {string} config.method - HTTP method (GET, POST, etc.)
   * @param {Object} config.data - Request body data
   * @param {Object} config.params - URL query parameters
   * @param {string} config.baseURL - Axios instance base URL
   * @returns {Object} Modified config with signature headers added
   */
  signRequest(config) {
    if (!this.isSecretValid()) {
      console.warn("[ADMIN_SIGNER] Signing secret expired or missing");
      return config;
    }

    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const method = config.method.toUpperCase();

    /**
     * CRITICAL PATH RECONSTRUCTION
     *
     * Step 1: Determine if URL is relative or absolute
     * Step 2: Extract pathname and search params
     * Step 3: Add query params from config.params if present
     * Step 4: Ensure path matches backend's req.path exactly
     */
    let path = config.url;

    // Case 1: Absolute URL (http://localhost:7000/api/content/settings)
    if (path.startsWith("http")) {
      try {
        const urlObj = new URL(path);
        // Extract pathname (includes /api prefix) + search params
        path = urlObj.pathname + urlObj.search;
      } catch (e) {
        console.error("[ADMIN_SIGNER] Failed to parse absolute URL:", path, e);
        // Fallback to original path
      }
    }
    // Case 2: Relative URL (/content/settings)
    // Backend sees: /api/content/settings
    // We must prepend /api to match backend's req.path
    else if (!path.startsWith("/api")) {
      // Extract base path from baseURL to get /api prefix
      try {
        if (config.baseURL) {
          const baseUrlObj = new URL(config.baseURL);
          const basePathname = baseUrlObj.pathname; // "/api"

          // Combine basePathname + relative path
          // Remove trailing slash from base, leading slash from path handled
          const cleanBasePath = basePathname.endsWith("/")
            ? basePathname.slice(0, -1)
            : basePathname;
          const cleanPath = path.startsWith("/") ? path : `/${path}`;

          path = cleanBasePath + cleanPath;
        }
      } catch (e) {
        console.error("[ADMIN_SIGNER] Failed to construct full path:", e);
      }
    }

    // Step 3: Append query parameters from config.params
    if (config.params && Object.keys(config.params).length > 0) {
      const searchParams = new URLSearchParams(config.params);
      const queryString = searchParams.toString();

      // Add query string with proper separator
      path = path.includes("?")
        ? `${path}&${queryString}`
        : `${path}?${queryString}`;
    }

    const body = config.data || {};

    try {
      const signature = this.generateSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      // Add signature headers
      config.headers = config.headers || {};
      config.headers["X-Request-Signature"] = signature;
      config.headers["X-Request-Timestamp"] = timestamp;
      config.headers["X-Request-Nonce"] = nonce;

      // Development logging
      if (import.meta.env.VITE_MODE === "development") {
        console.log("[ADMIN_SIGNER] Request signed:", {
          method,
          originalUrl: config.url,
          reconstructedPath: path,
          baseURL: config.baseURL,
          timestamp,
          noncePreview: nonce.substring(0, 10) + "...",
          signaturePreview: signature.substring(0, 16) + "...",
        });
      }
    } catch (error) {
      console.error("[ADMIN_SIGNER] Signing failed:", error);
      throw error; // Propagate error to prevent unsigned requests
    }

    return config;
  }
}

export const adminRequestSigner = new AdminRequestSigner();
