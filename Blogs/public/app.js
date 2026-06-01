const hexToBytes = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const randomHex = (byteLength) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const signRequest = async (url, method, body) => {
  const config = window.__BLOG_CONFIG__;
  const secretResponse = await fetch(`${config.apiBase}/api/security/signing-secret`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!secretResponse.ok) {
    throw new Error("Please log in on Vidhgrow before commenting.");
  }

  const secretData = await secretResponse.json();
  const secret = secretData?.data?.signingSecret;
  if (!secret) throw new Error("Could not prepare secure request.");

  const timestamp = Date.now().toString();
  const nonce = randomHex(16);
  const parsed = new URL(url);
  const path = parsed.pathname + parsed.search;
  const payload = `${timestamp}:${nonce}:${method}:${path}:${body || ""}`;
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return {
    "Content-Type": "application/json",
    "X-Request-Signature": signature,
    "X-Request-Timestamp": timestamp,
    "X-Request-Nonce": nonce,
  };
};

document.addEventListener("input", (event) => {
  if (event.target.matches(".comment-form textarea")) {
    const form = event.target.closest(".comment-form");
    const counter = form?.querySelector("[data-counter]");
    if (counter) counter.textContent = `${event.target.value.length}/100`;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest(".comment-form");
  if (!form) return;

  event.preventDefault();
  const textarea = form.querySelector("textarea");
  const content = textarea.value.trim();
  const postId = form.dataset.postId;
  const parentComment = form.dataset.parentComment || null;

  if (!content) return;
  if (content.length > 100) {
    alert("Comments are limited to 100 characters.");
    return;
  }

  const config = window.__BLOG_CONFIG__;
  const url = `${config.apiBase}/api/blogs/comments/${postId}`;
  const body = JSON.stringify({ content, parentComment });

  try {
    const headers = await signRequest(url, "POST", body);
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Comment failed");
    window.location.reload();
  } catch (error) {
    const loginUrl = `${config.loginUrl}?redirect=${encodeURIComponent(window.location.href)}`;
    if (confirm(`${error.message}\n\nOpen Vidhgrow login?`)) {
      window.location.href = loginUrl;
    }
  }
});

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-share-copy]");
  if (!copyButton) return;
  await navigator.clipboard.writeText(copyButton.dataset.shareCopy);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy link";
  }, 1400);
});
