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

const sanitizeSearchInput = (value = "") =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const syncSearchForm = (form) => {
  const input = form?.querySelector("input[name='q']");
  const button = form?.querySelector("button[type='submit']");
  if (!input || !button) return;
  button.disabled = !input.value.trim();
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

const loginUrl = () => {
  const config = window.__BLOG_CONFIG__;
  return `${config.loginUrl}?redirect=${encodeURIComponent(window.location.href)}`;
};

const setCommentFormsEnabled = (enabled) => {
  document.querySelectorAll(".comment-form textarea, .comment-form button[type='submit']").forEach((control) => {
    control.disabled = !enabled;
  });
};

const updateCommentAuthState = async () => {
  const panel = document.querySelector("[data-auth-panel]");
  if (!panel) return;

  const config = window.__BLOG_CONFIG__;
  const state = panel.querySelector("[data-auth-state]");
  const loginLink = panel.querySelector("[data-login-link]");
  if (loginLink) loginLink.href = loginUrl();

  try {
    const headers = await signRequest(config.profileUrl, "GET", "");
    const response = await fetch(config.profileUrl, {
      method: "GET",
      credentials: "include",
      headers,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Not logged in");
    const user = data?.data?.user || {};
    const name = user.name || user.username || "your Vidhgrow account";
    if (state) state.textContent = `Commenting as ${name}`;
    panel.classList.add("is-logged-in");
    setCommentFormsEnabled(true);
  } catch {
    if (state) state.textContent = "Log in on Vidhgrow to comment here.";
    panel.classList.remove("is-logged-in");
    setCommentFormsEnabled(false);
  }
};

const setupParallax = () => {
  const items = [...document.querySelectorAll("[data-parallax]")];
  if (!items.length) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  let ticking = false;
  const update = () => {
    const scrollY = window.scrollY || 0;
    items.forEach((item) => {
      const ySpeed = Number(item.dataset.parallax || 0);
      const xSpeed = Number(item.dataset.parallaxX || 0);
      const yOffset = Math.max(-130, Math.min(130, scrollY * ySpeed));
      const xOffset = Math.max(-60, Math.min(60, scrollY * xSpeed));
      const rotation = Math.max(-5, Math.min(5, scrollY * xSpeed * 0.08));
      item.style.setProperty("--parallax-y", `${yOffset.toFixed(1)}px`);
      item.style.setProperty("--parallax-x", `${xOffset.toFixed(1)}px`);
      item.style.setProperty("--parallax-r", `${rotation.toFixed(2)}deg`);
    });
    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
};

document.addEventListener("input", (event) => {
  if (event.target.matches(".comment-form textarea")) {
    const form = event.target.closest(".comment-form");
    const counter = form?.querySelector("[data-counter]");
    if (counter) counter.textContent = `${event.target.value.length}/100`;
  }

  if (event.target.matches(".search-form input[name='q']")) {
    syncSearchForm(event.target.closest(".search-form"));
  }
});

document.addEventListener("submit", async (event) => {
  const searchForm = event.target.closest(".search-form");
  if (searchForm) {
    event.preventDefault();

    const input = searchForm.querySelector("input[name='q']");
    const query = sanitizeSearchInput(input?.value || "");

    if (!query) {
      window.location.href = "/";
      return;
    }

    input.value = query;
    window.location.href = `/?q=${encodeURIComponent(query)}`;
    return;
  }

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
    if (confirm(`${error.message}\n\nOpen Vidhgrow login?`)) {
      window.location.href = loginUrl();
    }
  }
});

document.querySelectorAll(".search-form").forEach(syncSearchForm);
updateCommentAuthState();
setupParallax();

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-share-copy]");
  if (!copyButton) return;
  await navigator.clipboard.writeText(copyButton.dataset.shareCopy);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy link";
  }, 1400);
});
