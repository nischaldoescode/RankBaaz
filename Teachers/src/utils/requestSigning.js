/**
 * provides teacher request signing utilities for secure requests, validation, and shared client helpers
 *
 * @file teachers/src/utils/requestsigning.js
 * @module teachers/src/utils/requestsigning
 * @exports helpers imported by related app modules
 */

import crypto from "crypto-js";

/**
 * signs teacher panel requests using the same hmac flow as admin
 */
class TeacherRequestSigner {
  constructor() {
    this.signingSecret = null;
    this.secretExpiry = null;
  }

  setSigningSecret(secret, expiresIn) {
    this.signingSecret = secret;
    this.secretExpiry = Date.now() + expiresIn * 1000;
    localStorage.setItem("teacher_signing_secret", secret);
    localStorage.setItem("teacher_signing_secret_expiry", this.secretExpiry.toString());
  }

  loadSigningSecret() {
    const secret = localStorage.getItem("teacher_signing_secret");
    const expiry = localStorage.getItem("teacher_signing_secret_expiry");
    if (secret && expiry && Date.now() < parseInt(expiry)) {
      this.signingSecret = secret;
      this.secretExpiry = parseInt(expiry);
      return true;
    }
    return false;
  }

  clearSigningSecret() {
    this.signingSecret = null;
    this.secretExpiry = null;
    localStorage.removeItem("teacher_signing_secret");
    localStorage.removeItem("teacher_signing_secret_expiry");
  }

  isSecretValid() {
    return !!(this.signingSecret && Date.now() < this.secretExpiry);
  }

  generateNonce() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  generateSignature(method, path, body, timestamp, nonce) {
    if (!this.signingSecret) throw new Error("Signing secret not available");
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const bodyString =
      body && !isFormData && Object.keys(body).length > 0
        ? JSON.stringify(body)
        : "";
    const payload = `${timestamp}:${nonce}:${method}:${path}:${bodyString}`;
    return crypto.HmacSHA256(payload, this.signingSecret).toString();
  }

  signRequest(config) {
    if (!this.isSecretValid()) {
      console.warn("Secret expired or missing");
      return config;
    }

    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const method = config.method.toUpperCase();

    let path = config.url;

    if (path.startsWith("http")) {
      try {
        const urlObj = new URL(path);
        path = urlObj.pathname + urlObj.search;
      } catch (e) {
        console.error("Failed to parse URL:", e);
      }
    } else if (!path.startsWith("/api")) {
      try {
        if (config.baseURL) {
          const baseUrlObj = new URL(config.baseURL);
          const basePath = baseUrlObj.pathname.replace(/\/$/, "");
          const cleanPath = path.startsWith("/") ? path : `/${path}`;
          path = basePath + cleanPath;
        }
      } catch (e) {
        console.error("Failed to build path:", e);
      }
    }

    if (config.params && Object.keys(config.params).length > 0) {
      const qs = new URLSearchParams(config.params).toString();
      path = path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
    }

    try {
      const signature = this.generateSignature(method, path, config.data || {}, timestamp, nonce);
      config.headers = config.headers || {};
      config.headers["X-Request-Signature"] = signature;
      config.headers["X-Request-Timestamp"] = timestamp;
      config.headers["X-Request-Nonce"] = nonce;
    } catch (err) {
      console.error("Signing failed:", err);
      throw err;
    }

    return config;
  }
}

export const teacherRequestSigner = new TeacherRequestSigner();
