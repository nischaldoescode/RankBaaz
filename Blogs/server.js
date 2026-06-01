import http from "node:http";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadLocalEnv = () => {
  const envPath = path.join(__dirname, ".env");

  try {
    const envFile = readFileSync(envPath, "utf8");

    envFile
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) return;

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      });
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Could not load Blogs/.env: ${error.message}`);
    }
  }
};

loadLocalEnv();

const PORT = Number(process.env.PORT || 8080);
const API_BASE = (process.env.BLOG_API_BASE_URL || "http://localhost:7000").replace(/\/$/, "");
const PUBLIC_API_BASE = (process.env.PUBLIC_API_BASE_URL || API_BASE).replace(/\/$/, "");
const BLOG_ORIGIN = process.env.BLOGS_SITE_URL || "http://localhost:8080";
const BLOG_PUBLIC_URL = (process.env.BLOGS_PUBLIC_URL || "https://blogs.vidhgrow.online").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = `${BLOG_PUBLIC_URL}/android-chrome-512x512.png`;
const HOME_SEO_TITLE = "Vidhgrow Blogs | Product Updates, Teaching & Course News";
const HOME_SEO_DESCRIPTION =
  "Read Vidhgrow blogs about product updates, teacher workflows, course creation, assessment tools, student practice, and platform improvements for online learning.";
const ROOT_LINKS = [
  ["Latest blogs", "/"],
  ["Product releases", "/?q=feature"],
  ["Teacher workflows", "/?q=teacher"],
  ["Course builder", "/?q=course"],
  ["Assessment notes", "/?q=exam"],
  ["Student practice", "/?q=student"],
  ["Security updates", "/?q=security"],
  ["Feedback and ratings", "/?q=feedback"],
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (html = "") =>
  String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeSearchQuery = (value = "") =>
  stripHtml(value)
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const absoluteUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, BLOG_PUBLIC_URL).href;
  } catch {
    return "";
  }
};

const seoImage = (value = "") => absoluteUrl(value) || DEFAULT_OG_IMAGE;

const imageAlt = (image = {}, fallback = "Vidhgrow blog image") =>
  String(image?.alt || fallback).trim() || fallback;

const truncateMeta = (value = "", maxLength = 165) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  const trimmed = text.slice(0, maxLength - 3).replace(/\s+\S*$/, "");
  return `${trimmed || text.slice(0, maxLength - 3)}...`;
};

const metaTitle = (value = "", fallback = "Vidhgrow Blogs") => {
  const base = truncateMeta(value || fallback, 68);
  if (base.length >= 30) return base;
  return truncateMeta(`${base} | Vidhgrow Blogs`, 68);
};

const metaDescription = (value = "", fallback = HOME_SEO_DESCRIPTION) => {
  const base = truncateMeta(value || fallback, 165);
  if (base.length >= 135) return base;
  return truncateMeta(
    `${base} Read more Vidhgrow blogs on online learning, teacher workflows, course creation, student practice, and platform updates.`,
    165,
  );
};

const ensureContentImageAlts = (html = "", fallback = "Vidhgrow blog illustration") => {
  const alt = escapeHtml(fallback);
  return String(html)
    .replace(/<img\b(?![^>]*\balt=)([^>]*)>/gi, `<img alt="${alt}"$1>`)
    .replace(/<img\b([^>]*?)\s+alt=(["'])\s*\2([^>]*)>/gi, `<img$1 alt="${alt}"$3>`);
};

const authorFallback = (name = "Vidhgrow") => {
  const letter = String(name).trim().charAt(0).toUpperCase() || "V";
  const palette = [
    ["#dbeafe", "#1d4ed8"],
    ["#dcfce7", "#15803d"],
    ["#fef3c7", "#b45309"],
    ["#fae8ff", "#a21caf"],
    ["#fee2e2", "#b91c1c"],
    ["#e0f2fe", "#0369a1"],
  ];
  const [background, color] = palette[(letter.charCodeAt(0) || 0) % palette.length];
  return { letter, background, color };
};

const renderAuthorAvatar = (author = {}, className = "avatar-fallback") => {
  const name = author?.name || "Vidhgrow Editorial";
  if (author?.avatar?.url) {
    return `<img src="${escapeHtml(author.avatar.url)}" alt="${escapeHtml(author.avatar.alt || name)}" />`;
  }
  const fallback = authorFallback(name);
  return `<span class="${escapeHtml(className)} initial-avatar" style="background:${fallback.background};color:${fallback.color};">${escapeHtml(fallback.letter)}</span>`;
};

const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "";

const fetchJson = async (apiPath) => {
  const response = await fetch(`${API_BASE}${apiPath}`, {
    headers: {
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: BLOG_ORIGIN,
      Referer: `${BLOG_ORIGIN}/`,
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      "User-Agent": "VidhgrowBlogsSSR/1.0",
    },
  });

  if (!response.ok) {
    const error = new Error(`API ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

const pageShell = ({
  title,
  description,
  canonical,
  image,
  ogType = "website",
  robots = "index,follow,max-image-preview:large",
  body,
  jsonLd,
}) => {
  const shareImage = seoImage(image);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#3b82f6" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${escapeHtml(robots)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:site_name" content="Vidhgrow Blogs" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(shareImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(shareImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(shareImage)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  <link rel="alternate" type="application/rss+xml" title="Vidhgrow Blogs" href="${BLOG_PUBLIC_URL}/feed.xml" />
  <link rel="stylesheet" href="/assets/styles.css" />
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  ${body}
  <script>
    window.__BLOG_CONFIG__ = ${JSON.stringify({
      apiBase: PUBLIC_API_BASE,
      loginUrl: "https://vidhgrow.online/login",
    })};
  </script>
  <script src="/assets/app.js" defer></script>
</body>
</html>`;
};

const header = () => `<header class="site-header">
  <a class="wordmark" href="/">
    <img src="/logo.png" alt="Vidhgrow Blogs logo" width="40" height="40" />
    <span>Vidhgrow <em>Blogs</em></span>
  </a>
  <nav aria-label="Primary">
    <a href="/">Latest</a>
    <a href="/?q=feature">Features</a>
    <a href="/?q=teacher">Teachers</a>
    <a href="https://vidhgrow.online">Vidhgrow</a>
  </nav>
</header>`;

const footer = (settings = {}) => {
  const social = settings.socialMedia || {};
  const links = Object.entries(social).filter(([, url]) => url);
  return `<footer class="site-footer">
    <div class="footer-copy">
      <strong>Vidhgrow Blogs</strong>
      <p>Product updates, teacher workflows, course builder notes, student practice improvements, and platform decisions from the Vidhgrow team.</p>
      <nav class="footer-nav" aria-label="Blog topics">
        ${ROOT_LINKS.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
      </nav>
    </div>
    ${
      links.length
        ? `<div class="footer-links">${links
            .map(([name, url]) => `<a href="${escapeHtml(url)}" rel="me noopener noreferrer" target="_blank">${escapeHtml(name)}</a>`)
            .join("")}</div>`
        : ""
    }
  </footer>`;
};

const postCard = (post) => `<article class="post-card">
  <a href="/${escapeHtml(post.slug)}" class="post-card-image">
    <img src="${escapeHtml(seoImage(post.coverImage?.url))}" alt="${escapeHtml(imageAlt(post.coverImage, post.title))}" loading="lazy" />
  </a>
  <div class="post-card-copy">
    <time datetime="${escapeHtml(post.publishedAt || post.createdAt)}">${formatDate(post.publishedAt || post.createdAt)}</time>
    <h2><a href="/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
    <p>${escapeHtml(post.excerpt)}</p>
    <div class="post-meta">
      <a href="/author/${escapeHtml(post.author?.slug || "")}">${escapeHtml(post.author?.name || "Vidhgrow Editorial")}</a>
      <span>${post.readingTimeMinutes || 1} min read</span>
    </div>
  </div>
</article>`;

const renderHome = async (url) => {
  const query = sanitizeSearchQuery(url.searchParams.get("q") || "");
  const queryNeedle = query.toLowerCase();
  const [postsRes, settingsRes] = await Promise.all([
    fetchJson("/api/blogs/public?limit=24"),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  let posts = postsRes.data.posts || [];

  if (query) {
    posts = posts.filter((post) =>
      [post.title, post.excerpt, post.author?.name, ...(post.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(queryNeedle),
    );
  }

  const latest = posts[0];
  const body = `${header()}
<main id="main" class="home-shell">
  <section class="home-intro">
    <div class="home-copy">
      <p class="eyebrow">Vidhgrow Blogs</p>
      <h1>Updates from the platform we are building for serious practice.</h1>
      <p class="lede">Feature releases, teacher workflows, course improvements, assessment design, and product decisions from the Vidhgrow team.</p>
      <div class="topic-links" aria-label="Editorial topics">
        <a href="/?q=feature">Product releases</a>
        <a href="/?q=teacher">Teacher portal</a>
        <a href="/?q=course">Course builder</a>
        <a href="/?q=exam">Assessment notes</a>
        <a href="/?q=student">Student practice</a>
        <a href="/?q=security">Security updates</a>
      </div>
    </div>
    <form class="search-form" method="get" action="/">
      <label for="q">Search posts</label>
      <div>
        <input id="q" name="q" value="${escapeHtml(query)}" placeholder="Search updates..." maxlength="80" autocomplete="off" />
        <button type="submit">Search</button>
      </div>
    </form>
  </section>
  <section class="news-strip" aria-label="What we publish">
    <article><span>01</span><strong>Product releases</strong><p>Clear notes on what changed, why it matters, and where it helps students or teachers.</p></article>
    <article><span>02</span><strong>Platform decisions</strong><p>Short explanations of the design, security, and workflow choices behind Vidhgrow.</p></article>
    <article><span>03</span><strong>Practice guidance</strong><p>Useful exam, course, and feedback ideas tied to real activity on the platform.</p></article>
  </section>
  ${
    latest && !query
      ? `<section class="featured-post">
          <a href="/${escapeHtml(latest.slug)}"><img src="${escapeHtml(seoImage(latest.coverImage?.url))}" alt="${escapeHtml(imageAlt(latest.coverImage, latest.title))}" /></a>
          <div>
            <p class="section-kicker">Latest story</p>
            <time datetime="${escapeHtml(latest.publishedAt || latest.createdAt)}">${formatDate(latest.publishedAt || latest.createdAt)}</time>
            <h2><a href="/${escapeHtml(latest.slug)}">${escapeHtml(latest.title)}</a></h2>
            <p>${escapeHtml(latest.excerpt)}</p>
          </div>
        </section>`
      : ""
  }
  <div class="section-heading">
    <p class="eyebrow">${query ? "Search results" : "Platform notes"}</p>
    <h2>${query ? `Posts matching "${escapeHtml(query)}"` : "Blog updates, features, and practical decisions from Vidhgrow."}</h2>
  </div>
  <section class="post-list" aria-label="Blog posts">
    ${posts.map(postCard).join("") || `<div class="empty-state">No posts found.</div>`}
  </section>
  <section class="browse-links" aria-labelledby="browse-title">
    <div>
      <p class="eyebrow">Browse</p>
      <h2 id="browse-title">Explore Vidhgrow blog topics</h2>
    </div>
    <nav aria-label="More blog topics">
      ${ROOT_LINKS.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
    </nav>
  </section>
</main>
${footer(settingsRes.data)}`;

  return pageShell({
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    canonical: BLOG_PUBLIC_URL,
    image: latest?.coverImage?.url,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Vidhgrow Blogs",
      description: HOME_SEO_DESCRIPTION,
      url: BLOG_PUBLIC_URL,
    },
  });
};

const robotsString = (seo = {}) => {
  const robots = seo.robots || {};
  return [
    robots.index === false ? "noindex" : "index",
    robots.follow === false ? "nofollow" : "follow",
    `max-image-preview:${robots.maxImagePreview || "large"}`,
    `max-snippet:${Number.isFinite(robots.maxSnippet) ? robots.maxSnippet : -1}`,
  ].join(",");
};

const renderComments = (post, comments = []) => `<section class="comments" aria-labelledby="comments-title">
  <h2 id="comments-title">Comments</h2>
  <p class="comments-note">Log in with your Vidhgrow account to comment. One top-level comment per user, 100 characters max.</p>
  <form class="comment-form" data-post-id="${escapeHtml(post._id)}">
    <textarea name="content" maxlength="100" rows="3" placeholder="Write a short comment"></textarea>
    <div class="comment-actions"><span data-counter>0/100</span><button type="submit">Post comment</button></div>
  </form>
  <div class="comment-list">
    ${comments
      .map((comment) => {
        const id = `c-${String(comment._id).slice(-6)}`;
        return `<article class="comment" id="${id}">
          <a class="comment-id" href="#${id}" data-preview="${escapeHtml(comment.content)}">#${id}</a>
          <strong>${escapeHtml(comment.user?.name || comment.user?.username || "Reader")}</strong>
          <p>${escapeHtml(comment.content)}</p>
          <form class="comment-form reply" data-post-id="${escapeHtml(post._id)}" data-parent-comment="${escapeHtml(comment._id)}">
            <textarea name="content" maxlength="100" rows="2" placeholder="Reply to your comment"></textarea>
            <div class="comment-actions"><span data-counter>0/100</span><button type="submit">Reply</button></div>
          </form>
          ${
            comment.replies?.length
              ? `<div class="replies">${comment.replies
                  .map(
                    (reply) => `<article class="comment reply-item">
                      <strong>${escapeHtml(reply.user?.name || reply.user?.username || "Reader")}</strong>
                      <p>${escapeHtml(reply.content)}</p>
                    </article>`,
                  )
                  .join("")}</div>`
              : ""
          }
        </article>`;
      })
      .join("")}
  </div>
</section>`;

const renderRelatedPosts = (posts = []) => {
  if (!posts.length) return "";

  return `<section class="related-posts" aria-labelledby="related-title">
    <div class="section-heading compact">
      <p class="eyebrow">Read next</p>
      <h2 id="related-title">Related blogs</h2>
    </div>
    <div class="related-grid">
      ${posts
        .slice(0, 3)
        .map(
          (post) => `<article class="related-card">
            <a href="/${escapeHtml(post.slug)}" class="related-image">
              <img src="${escapeHtml(seoImage(post.coverImage?.url))}" alt="${escapeHtml(imageAlt(post.coverImage, post.title))}" loading="lazy" />
            </a>
            <time datetime="${escapeHtml(post.publishedAt || post.createdAt)}">${formatDate(post.publishedAt || post.createdAt)}</time>
            <h3><a href="/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || "")}</p>
          </article>`,
        )
        .join("")}
    </div>
  </section>`;
};

const renderPost = async (slug) => {
  const [postRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/public/${encodeURIComponent(slug)}`),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { post, comments, relatedPosts } = postRes.data;
  const canonical = post.seo?.canonicalUrl || `${BLOG_PUBLIC_URL}/${post.slug}`;
  const title = metaTitle(post.seo?.metaTitle || post.title, post.title);
  const description = metaDescription(post.seo?.metaDescription || post.excerpt, post.excerpt || post.plainTextPreview);
  const social = settingsRes.data?.socialMedia || {};
  const shareUrl = `${BLOG_PUBLIC_URL}/${post.slug}`;
  const shareTitle = post.social?.shareTitle || post.title;
  const coverUrl = seoImage(post.coverImage?.url);
  const coverAlt = imageAlt(post.coverImage, `${post.title} cover image`);
  const contentHtml = ensureContentImageAlts(post.contentHtml, post.title);

  const body = `${header()}
<main id="main" class="article-shell">
  <article class="article">
    <p class="eyebrow">${escapeHtml(post.category || "learning")}</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="article-excerpt">${escapeHtml(post.excerpt)}</p>
    <div class="article-byline">
      ${renderAuthorAvatar(post.author)}
      <div>
        <a href="/author/${escapeHtml(post.author?.slug || "")}">${escapeHtml(post.author?.name || "Vidhgrow Editorial")}</a>
        <span>${formatDate(post.publishedAt || post.createdAt)} · ${post.readingTimeMinutes || 1} min read</span>
      </div>
    </div>
    <img class="article-cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(coverAlt)}" />
    <div class="article-content">${contentHtml}</div>
    <div class="share-panel">
      <span>Share</span>
      <button data-share-copy="${escapeHtml(shareUrl)}">Copy link</button>
      <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}" target="_blank" rel="noopener noreferrer">Twitter/X</a>
      <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener noreferrer">Facebook</a>
    </div>
    ${
      Object.values(social).some(Boolean)
        ? `<div class="follow-panel"><span>Follow Vidhgrow</span>${Object.entries(social)
            .filter(([, value]) => value)
            .map(([key, value]) => `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(key)}</a>`)
            .join("")}</div>`
        : ""
    }
  </article>
  ${renderRelatedPosts(relatedPosts || [])}
  ${renderComments(post, comments || [])}
</main>
${footer(settingsRes.data)}`;

  return pageShell({
    title,
    description,
    canonical,
    image: coverUrl,
    ogType: "article",
    robots: robotsString(post.seo),
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      image: coverUrl,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: {
        "@type": "Person",
        name: post.author?.name || "Vidhgrow Editorial",
        url: post.author?.slug ? `${BLOG_PUBLIC_URL}/author/${post.author.slug}` : BLOG_PUBLIC_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "Vidhgrow",
        url: "https://vidhgrow.online",
      },
      mainEntityOfPage: canonical,
      wordCount: post.wordCount,
    },
  });
};

const renderAuthor = async (slug) => {
  const [authorRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/authors/${encodeURIComponent(slug)}`),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { author, posts } = authorRes.data;
  const body = `${header()}
<main id="main" class="author-shell">
  <section class="author-card">
    ${renderAuthorAvatar(author, "author-fallback")}
    <div>
      <p class="eyebrow">Author</p>
      <h1>${escapeHtml(author.name)}</h1>
      ${author.title ? `<p class="author-title">${escapeHtml(author.title)}</p>` : ""}
      ${author.bio ? `<p>${escapeHtml(author.bio)}</p>` : ""}
    </div>
  </section>
  <section class="post-list">${posts.map(postCard).join("")}</section>
</main>
  ${footer(settingsRes.data)}`;
  return pageShell({
    title: metaTitle(`${author.name} - Vidhgrow Blogs`, author.name),
    description: metaDescription(
      author.bio,
      `Read posts by ${author.name} on Vidhgrow Blogs, including product updates, teacher workflows, course notes, and online learning insights.`,
    ),
    canonical: `${BLOG_PUBLIC_URL}/author/${author.slug}`,
    image: author.avatar?.url,
    ogType: "profile",
    body,
  });
};

const render404 = () =>
  pageShell({
    title: "Page not found - Vidhgrow Blog",
    description: "This Vidhgrow Blog page could not be found.",
    canonical: `${BLOG_PUBLIC_URL}/404`,
    robots: "noindex,follow",
    body: `${header()}<main id="main" class="not-found"><p class="eyebrow">404</p><h1>That page is not here.</h1><p>The link may be old, or the post may have moved.</p><a href="/">Back to the blog</a></main>${footer()}`,
  });

const renderFeed = async () => {
  const res = await fetchJson("/api/blogs/public?limit=30");
  const posts = res.data.posts || [];
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Vidhgrow Blogs</title>
    <link>${BLOG_PUBLIC_URL}</link>
    <description>${escapeHtml(HOME_SEO_DESCRIPTION)}</description>
    ${posts
      .map(
        (post) => `<item>
      <title>${escapeHtml(post.title)}</title>
      <link>${BLOG_PUBLIC_URL}/${escapeHtml(post.slug)}</link>
      <guid>${BLOG_PUBLIC_URL}/${escapeHtml(post.slug)}</guid>
      <pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
      <description>${escapeHtml(post.excerpt)}</description>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;
};

const assetCache = new Map();

const minifyCss = (content) =>
  String(content)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();

const minifyJs = (content) =>
  String(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s*([{}()[\];,:])\s*/g, "$1")
    .trim();

const readAsset = async (filePath, transform) => {
  const cacheKey = `${filePath}:${transform || "raw"}`;
  if (assetCache.has(cacheKey)) return assetCache.get(cacheKey);

  const raw = await fs.readFile(path.join(__dirname, filePath), "utf8");
  const content = transform === "css" ? minifyCss(raw) : transform === "js" ? minifyJs(raw) : raw;
  assetCache.set(cacheKey, content);
  return content;
};

const serveStatic = async (res, filePath, contentType, options = {}) => {
  const content = options.transform
    ? await readAsset(filePath, options.transform)
    : await fs.readFile(path.join(__dirname, filePath));
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(content);
};

const redirectToCanonicalHost = (req, res) => {
  const canonicalHost = new URL(BLOG_PUBLIC_URL).host.toLowerCase();
  const requestHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!requestHost || requestHost.includes("localhost") || requestHost === canonicalHost) {
    return false;
  }

  if (requestHost === `www.${canonicalHost}` || requestHost.replace(/^www\./, "") === canonicalHost) {
    const target = `${BLOG_PUBLIC_URL}${req.url || "/"}`;
    res.writeHead(301, {
      Location: target,
      "Cache-Control": "public, max-age=3600",
    });
    res.end();
    return true;
  }

  return false;
};

const server = http.createServer(async (req, res) => {
  try {
    if (redirectToCanonicalHost(req, res)) return;

    const url = new URL(req.url, BLOG_ORIGIN);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/assets/styles.css") {
      return serveStatic(res, "public/styles.css", "text/css; charset=utf-8", { transform: "css" });
    }
    if (pathname === "/assets/app.js") {
      return serveStatic(res, "public/app.js", "application/javascript; charset=utf-8", { transform: "js" });
    }
    if (pathname === "/logo.png") {
      return serveStatic(res, "public/logo.png", "image/png");
    }
    if (pathname === "/favicon.ico") {
      return serveStatic(res, "public/favicon.ico", "image/x-icon");
    }
    if (pathname === "/favicon-32x32.png") {
      return serveStatic(res, "public/favicon-32x32.png", "image/png");
    }
    if (pathname === "/favicon-16x16.png") {
      return serveStatic(res, "public/favicon-16x16.png", "image/png");
    }
    if (pathname === "/apple-touch-icon.png") {
      return serveStatic(res, "public/apple-touch-icon.png", "image/png");
    }
    if (pathname === "/android-chrome-192x192.png") {
      return serveStatic(res, "public/android-chrome-192x192.png", "image/png");
    }
    if (pathname === "/android-chrome-512x512.png") {
      return serveStatic(res, "public/android-chrome-512x512.png", "image/png");
    }
    if (pathname === "/site.webmanifest") {
      return serveStatic(res, "public/site.webmanifest", "application/manifest+json; charset=utf-8");
    }
    if (pathname === "/browserconfig.xml") {
      return serveStatic(res, "public/browserconfig.xml", "application/xml; charset=utf-8");
    }
    if (pathname === "/google71d3fdc4e5a7d6ef.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("google-site-verification: google71d3fdc4e5a7d6ef.html");
    }
    if (pathname === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(`User-agent: *
Allow: /
Sitemap: ${BLOG_PUBLIC_URL}/sitemap.xml
`);
    }
    if (pathname === "/sitemap.xml") {
      const sitemap = await fetch(`${API_BASE}/api/blogs/sitemap.xml`, {
        headers: { Origin: BLOG_ORIGIN, Referer: `${BLOG_ORIGIN}/` },
      }).then((r) => r.text());
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
      return res.end(sitemap);
    }
    if (pathname === "/feed.xml") {
      res.writeHead(200, { "Content-Type": "application/rss+xml; charset=utf-8" });
      return res.end(await renderFeed());
    }

    let html;
    if (pathname === "/") {
      html = await renderHome(url);
    } else if (pathname.startsWith("/author/")) {
      html = await renderAuthor(pathname.replace("/author/", ""));
    } else if (/^\/[a-z0-9-]+$/.test(pathname)) {
      html = await renderPost(pathname.slice(1));
    } else {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(render404());
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    res.end(html);
  } catch (error) {
    if (error.status === 404) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(render404());
    }
    console.error("[BLOGS_SSR] Render error:", error);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      pageShell({
        title: "Temporarily unavailable - Vidhgrow Blog",
        description: "The Vidhgrow Blog is temporarily unavailable.",
        canonical: BLOG_PUBLIC_URL,
        robots: "noindex,nofollow",
        body: `${header()}<main class="not-found"><h1>Temporarily unavailable.</h1><p>Please try again shortly.</p></main>`,
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`Vidhgrow Blogs SSR running on http://localhost:${PORT}`);
});
