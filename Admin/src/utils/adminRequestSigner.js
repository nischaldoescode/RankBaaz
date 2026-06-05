/**
 * provides the admin request signer utility for signed requests, secure api calls, and shared helpers
 *
 * @file admin/src/utils/adminrequestsigner.js
 * @module admin/src/utils/adminrequestsigner
 * @exports helpers imported by related app modules
 */

import crypto from "crypto-js";
import axios from "axios";

/**
 * admin request signer
 * handles hmac-sha256 signing for admin panel api requests
 *
 * security features:
 * - separate signing secret from user frontend
 * - hmac-sha256 signatures
 * - nonce for replay protection
 * - timestamp validation (5min window)
 *
 * @class adminrequestsigner
 */
class AdminRequestSigner {
  constructor() {
    this.signingSecret = null;
    this.secretExpiry = null;
  }

  /**
   * set signing secret and expiration time
   *
   * @param {string} secret - hmac secret key
   * @param {number} expiresin - expiration time in seconds
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
   * load signing secret from localstorage
   *
   * @returns {boolean} true if valid secret loaded, false otherwise
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
   * clear signing secret from memory and storage
   */
  clearSigningSecret() {
    this.signingSecret = null;
    this.secretExpiry = null;
    localStorage.removeItem("admin_signing_secret");
    localStorage.removeItem("admin_signing_secret_expiry");
  }

  /**
   * check if signing secret is still valid
   *
   * @returns {boolean} true if secret exists and not expired
   */
  isSecretValid() {
    return this.signingSecret && Date.now() < this.secretExpiry;
  }

  /**
   * generate cryptographically secure random nonce
   *
   * @returns {string} 16-byte hex nonce
   */
  generateNonce() {
    // use web crypto api for cryptographically strong randomness
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    // convert to hex string (32 characters)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * generate hmac-sha256 signature for request
   *
   * @param {string} method - http method (get, post, etc.)
   * @param {string} path - request path
   * @param {object} body - request body
   * @param {string} timestamp - request timestamp
   * @param {string} nonce - request nonce
   * @returns {string} hmac-sha256 signature
   * @throws {error} if signing secret not available
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
   * build the exact path axios will send, including query params
   *
   * axios drops null/undefined params from the real request url. using
   * urlsearchparams directly turns undefined into "undefined", which breaks
   * hmac checks for optional params such as excludeid
   */
  buildSignedPath(config) {
    const baseURL = config.baseURL || axios.defaults.baseURL || window.location.origin;
    const requestUri = axios.getUri({ ...config, baseURL });

    try {
      const parsedUrl = new URL(requestUri, baseURL || window.location.origin);
      return parsedUrl.pathname + parsedUrl.search;
    } catch (error) {
      console.error("Failed to build signed path:", error);
      return config.url || "/";
    }
  }

  /**
   * sign axios request config with hmac-sha256 signature
   *
   * path construction logic:
   * backend uses req.path which includes the full api path
   *
   * examples:
   * - axios config.url = "/content/settings"
   * - axios config.baseurl = "http://localhost:7000/api"
   * - backend req.path = "/api/content/settings"
   *
   * therefore, we reconstruct the full path including /api prefix
   * to match what the backend verification middleware sees
   *
   * @param {object} config - axios request configuration object
   * @param {string} config.url - relative or absolute request url
   * @param {string} config.method - http method (get, post, etc.)
   * @param {object} config.data - request body data
   * @param {object} config.params - url query parameters
   * @param {string} config.baseurl - axios instance base url
   * @returns {object} modified config with signature headers
   */
  signRequest(config) {
    if (!this.isSecretValid()) {
      console.warn("Signing secret expired or missing");
      return config;
    }

    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const method = (config.method || "get").toUpperCase();
    const path = this.buildSignedPath(config);

    const body = config.data || {};

    try {
      const signature = this.generateSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      // signature headers
      config.headers = config.headers || {};
      config.headers["X-Request-Signature"] = signature;
      config.headers["X-Request-Timestamp"] = timestamp;
      config.headers["X-Request-Nonce"] = nonce;

      // development logging
      if (import.meta.env.VITE_MODE === "development") {
        console.log("Request signed:", {
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
      console.error("Signing failed:", error);
      throw error; // propagate error to prevent unsigned requests
    }

    return config;
  }
}

export const adminRequestSigner = new AdminRequestSigner();
