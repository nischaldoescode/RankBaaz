/**
 * provides public request signing utilities for secure requests, validation, caching, and shared helpers
 *
 * @file frontend/src/utils/requestsigning.js
 * @module frontend/src/utils/requestsigning
 * @exports helpers imported by related app modules
 */

import crypto from "crypto-js";

// utility for signing api requests
class RequestSigner {
  constructor() {
    this.signingSecret = null;
    this.secretExpiry = null;
  }

  setSigningSecret(secret, expiresIn) {
    this.signingSecret = secret;
    this.secretExpiry = Date.now() + expiresIn * 1000;

    localStorage.setItem("signing_secret", secret);
    localStorage.setItem("signing_secret_expiry", this.secretExpiry.toString());
  }

  loadSigningSecret() {
    const secret = localStorage.getItem("signing_secret");
    const expiry = localStorage.getItem("signing_secret_expiry");

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
    localStorage.removeItem("signing_secret");
    localStorage.removeItem("signing_secret_expiry");
  }

  isSecretValid() {
    return this.signingSecret && Date.now() < this.secretExpiry;
  }

  generateNonce() {
    // use web crypto api for cryptographically strong randomness
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);

    // convert to hex string (32 characters)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  generateSignature(method, path, body, timestamp, nonce) {
    if (!this.signingSecret) {
      throw new Error("Signing secret not available");
    }

    const bodyString =
      body && Object.keys(body).length > 0 ? JSON.stringify(body) : "";

    const payload = `${timestamp}:${nonce}:${method}:${path}:${bodyString}`;

    return crypto.HmacSHA256(payload, this.signingSecret).toString();
  }

  signRequest(config) {
    if (!this.isSecretValid()) {
      console.warn("Signing secret expired or missing");
      return config;
    }

    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const method = config.method.toUpperCase();
    const path = config.url;
    const body = config.data || {};

    try {
      const signature = this.generateSignature(
        method,
        path,
        body,
        timestamp,
        nonce
      );

      config.headers = config.headers || {};
      config.headers["X-Request-Signature"] = signature;
      config.headers["X-Request-Timestamp"] = timestamp;
      config.headers["X-Request-Nonce"] = nonce;

      if (import.meta.env.VITE_MODE === "development") {
        console.log("Request signed:", {
          method,
          path,
          timestamp,
          signaturePreview: signature.substring(0, 16) + "...",
        });
      }
    } catch (error) {
      console.error("Signing failed:", error);
    }

    return config;
  }
}

export const requestSigner = new RequestSigner();
