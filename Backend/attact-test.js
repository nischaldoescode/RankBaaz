// /**
//  * Security Test: Attempt to use stolen signing secret
//  * 
//  * This simulates an attacker who:
//  * 1. Extracts signing secret from localStorage
//  * 2. Attempts to make requests from Node.js
//  * 3. Tries to bypass bot protection with fake headers
//  * 
//  * Expected Result: ALL attacks should FAIL
//  */

// import axios from "axios";
// import crypto from "crypto-js";

// const API_URL = "http://localhost:7000";

// /**
//  * ATTACK 1: Stolen secret + fake browser headers
//  */
// async function attackWithStolenSecret() {
//   console.log("\n=== ATTACK 1: Stolen Secret + Fake Headers ===");

//   // Attacker extracts this from browser localStorage
//   const stolenSecret = "YOUR_STOLEN_SECRET_HERE"; // Replace with actual secret from browser

//   const timestamp = Date.now().toString();
//   const nonce = crypto.lib.WordArray.random(16).toString();
//   const method = "GET";
//   const path = "/api/courses/admin/all";
//   const body = "";

//   const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;
//   const signature = crypto.HmacSHA256(payload, stolenSecret).toString();

//   try {
//     const response = await axios.get(`${API_URL}${path}`, {
//       headers: {
//         "X-Request-Signature": signature,
//         "X-Request-Timestamp": timestamp,
//         "X-Request-Nonce": nonce,
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//         Accept:
//           "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
//         "Accept-Language": "en-US,en;q=0.5",
//         "Accept-Encoding": "gzip, deflate, br",
//         Origin: "http://localhost:5173",
//         Referer: "http://localhost:5173/",
//       },
//       withCredentials: true,
//     });

//     console.log("❌ ATTACK SUCCEEDED:", response.status);
//     console.log("Data:", response.data);
//   } catch (error) {
//     console.log("✅ ATTACK BLOCKED:", error.response?.status);
//     console.log("Reason:", error.response?.data?.message || error.message);
//   }
// }

// /**
//  * ATTACK 2: Stolen secret + stolen cookies
//  */
// async function attackWithStolenCookies() {
//   console.log("\n=== ATTACK 2: Stolen Secret + Stolen Cookies ===");

//   const stolenSecret = "YOUR_STOLEN_SECRET_HERE";
//   const stolenCookie = "YOUR_STOLEN_COOKIE_HERE"; // adminToken cookie

//   const timestamp = Date.now().toString();
//   const nonce = crypto.lib.WordArray.random(16).toString();
//   const method = "GET";
//   const path = "/api/courses/admin/stats";
//   const body = "";

//   const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;
//   const signature = crypto.HmacSHA256(payload, stolenSecret).toString();

//   try {
//     const response = await axios.get(`${API_URL}${path}`, {
//       headers: {
//         "X-Request-Signature": signature,
//         "X-Request-Timestamp": timestamp,
//         "X-Request-Nonce": nonce,
//         Cookie: `adminToken=${stolenCookie}`,
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//         Origin: "http://localhost:5173",
//       },
//     });

//     console.log("❌ ATTACK SUCCEEDED:", response.status);
//   } catch (error) {
//     console.log("✅ ATTACK BLOCKED:", error.response?.status);
//     console.log("Reason:", error.response?.data?.message || error.message);
//   }
// }

// /**
//  * ATTACK 3: Replay attack (reuse old signature)
//  */
// async function attackReplayAttack() {
//   console.log("\n=== ATTACK 3: Replay Attack ===");

//   const stolenSecret = "YOUR_STOLEN_SECRET_HERE";

//   // First request
//   const timestamp = Date.now().toString();
//   const nonce = crypto.lib.WordArray.random(16).toString();
//   const method = "GET";
//   const path = "/api/courses/categories";
//   const body = "";

//   const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;
//   const signature = crypto.HmacSHA256(payload, stolenSecret).toString();

//   try {
//     // Make request twice with same signature
//     console.log("Request 1...");
//     await axios.get(`${API_URL}${path}`, {
//       headers: {
//         "X-Request-Signature": signature,
//         "X-Request-Timestamp": timestamp,
//         "X-Request-Nonce": nonce,
//         Origin: "http://localhost:5173",
//       },
//     });

//     console.log("Request 2 (replay)...");
//     const response2 = await axios.get(`${API_URL}${path}`, {
//       headers: {
//         "X-Request-Signature": signature,
//         "X-Request-Timestamp": timestamp,
//         "X-Request-Nonce": nonce,
//         Origin: "http://localhost:5173",
//       },
//     });

//     console.log("❌ REPLAY ATTACK SUCCEEDED:", response2.status);
//   } catch (error) {
//     console.log("✅ REPLAY ATTACK BLOCKED:", error.response?.status);
//     console.log("Reason:", error.response?.data?.code || error.message);
//   }
// }

// /**
//  * ATTACK 4: Tampered request body
//  */
// async function attackTamperedBody() {
//   console.log("\n=== ATTACK 4: Tampered Request Body ===");

//   const stolenSecret = "YOUR_STOLEN_SECRET_HERE";

//   const timestamp = Date.now().toString();
//   const nonce = crypto.lib.WordArray.random(16).toString();
//   const method = "POST";
//   const path = "/api/courses";

//   // Original body
//   const originalBody = { name: "Test Course" };
//   const payload = `${timestamp}:${nonce}:${method}:${path}:${JSON.stringify(originalBody)}`;
//   const signature = crypto.HmacSHA256(payload, stolenSecret).toString();

//   // Tampered body
//   const tamperedBody = { name: "Hacked Course", isActive: true };

//   try {
//     const response = await axios.post(`${API_URL}${path}`, tamperedBody, {
//       headers: {
//         "X-Request-Signature": signature,
//         "X-Request-Timestamp": timestamp,
//         "X-Request-Nonce": nonce,
//         Origin: "http://localhost:5173",
//       },
//     });

//     console.log("❌ TAMPER ATTACK SUCCEEDED:", response.status);
//   } catch (error) {
//     console.log("✅ TAMPER ATTACK BLOCKED:", error.response?.status);
//     console.log("Reason:", error.response?.data?.code || error.message);
//   }
// }

// /**
//  * Run all attacks
//  */
// async function runAllAttacks() {
//   console.log("🔴 SECURITY TEST: Attempting attacks with stolen credentials");
//   console.log("Expected: ALL attacks should be blocked\n");

//   await attackWithStolenSecret();
//   await attackWithStolenCookies();
//   await attackReplayAttack();
//   await attackTamperedBody();

//   console.log("\n=== TEST COMPLETE ===");
// }

// runAllAttacks();


await fetch('http://localhost:7000/api/security/signing-secret/clear', {
  method: 'DELETE',
  credentials: 'include'
});