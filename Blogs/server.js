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
const BLOG_INDEXNOW_KEY = String(
  process.env.BLOG_INDEXNOW_KEY || "e52015b801f54ed398dec9c093f1405b",
).trim();
const DEFAULT_OG_IMAGE = `${BLOG_PUBLIC_URL}/android-chrome-512x512.png`;
const HOME_SEO_TITLE = "Vidhgrow Blogs | Product Updates, Teaching & Course News";
const HOME_SEO_DESCRIPTION =
  "The official Vidhgrow blog for product news, teaching workflows, course updates, student practice ideas, and clear platform notes from the team.";
const TOPIC_LINKS = [
  {
    slug: "product-updates",
    navLabel: "Product notes",
    introLabel: "Product update notes",
    browseLabel: "Explore product updates",
    footerLabel: "Release archive",
    terms: ["product", "feature", "release", "platform"],
    title: "Vidhgrow Product Updates",
    description: "Latest Vidhgrow product updates, feature releases, platform improvements, and practical notes for students, teachers, and admins.",
  },
  {
    slug: "teaching-workflows",
    navLabel: "Teaching",
    introLabel: "Teaching workflow notes",
    browseLabel: "Read teaching workflows",
    footerLabel: "Teacher articles",
    terms: ["teacher", "teaching", "workflow", "portal"],
    title: "Teaching Workflows on Vidhgrow",
    description: "Teacher workflow articles about verification, course setup, feedback, profiles, documents, and classroom-ready online learning tools.",
  },
  {
    slug: "course-news",
    navLabel: "Course news",
    introLabel: "Course builder news",
    browseLabel: "Open course news",
    footerLabel: "Course stories",
    terms: ["course", "builder", "lesson", "curriculum"],
    title: "Course News and Builder Notes",
    description: "Course news from Vidhgrow, including builder updates, lesson structure, publishing workflows, and improvements for online learning content.",
  },
  {
    slug: "assessment-notes",
    navLabel: "Assessment",
    introLabel: "Assessment design notes",
    browseLabel: "Study assessment notes",
    footerLabel: "Exam writing",
    terms: ["exam", "test", "assessment", "practice"],
    title: "Assessment Notes for Serious Practice",
    description: "Assessment notes about tests, exam strategy, student practice, feedback loops, completion signals, and learning progress on Vidhgrow.",
  },
  {
    slug: "security-updates",
    navLabel: "Security",
    introLabel: "Security and trust updates",
    browseLabel: "Review security updates",
    footerLabel: "Trust notes",
    terms: ["security", "verification", "privacy", "backend"],
    title: "Security Updates and Trust Notes",
    description: "Security updates covering verification, signed requests, protected media, admin controls, and backend hardening for the Vidhgrow platform.",
  },
  {
    slug: "student-progress",
    navLabel: "Students",
    introLabel: "Student progress notes",
    browseLabel: "Follow student progress",
    footerLabel: "Student progress",
    terms: ["student", "progress", "practice", "completion"],
    title: "Student Progress and Practice Notes",
    description: "Student progress articles about practice, completion signals, feedback, learning habits, and clearer course outcomes on Vidhgrow.",
  },
  {
    slug: "admin-workflows",
    navLabel: "Admin",
    introLabel: "Admin workflow updates",
    browseLabel: "Review admin workflows",
    footerLabel: "Admin workflows",
    terms: ["admin", "approval", "workflow", "management"],
    title: "Admin Workflows and Platform Operations",
    description: "Admin workflow notes covering approvals, publishing, moderation, authors, comments, teacher management, and platform operations.",
  },
  {
    slug: "feedback-notes",
    navLabel: "Feedback",
    introLabel: "Feedback and rating notes",
    browseLabel: "Read feedback notes",
    footerLabel: "Feedback notes",
    terms: ["feedback", "rating", "review", "comment"],
    title: "Feedback, Ratings, and Reader Notes",
    description: "Feedback notes about course ratings, teacher reviews, reader comments, quality signals, and useful responses from the Vidhgrow community.",
  },
];
const INTRO_LINKS = TOPIC_LINKS.map((topic) => [topic.introLabel, `/topic/${topic.slug}`]);
const BROWSE_LINKS = [["Start with the latest writing", "/"], ...TOPIC_LINKS.map((topic) => [topic.browseLabel, `/topic/${topic.slug}`])];
const ROOT_LINKS = [["Latest Vidhgrow blogs", "/"], ...TOPIC_LINKS.map((topic) => [topic.footerLabel, `/topic/${topic.slug}`])];
const EXTERNAL_READING_LINKS = [
  ["Google Search Central", "https://developers.google.com/search/docs"],
  ["Schema.org BlogPosting", "https://schema.org/BlogPosting"],
  ["Google SEO starter guide", "https://developers.google.com/search/docs/fundamentals/seo-starter-guide"],
];
const API_CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const LIST_API_CACHE_TTL_MS = 30 * 1000;
const HOME_PAGE_CACHE_TTL_MS = 30 * 1000;

const securityHeaders = () => ({
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
});

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

const normalizeTopicSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const getTopic = (slug = "") =>
  TOPIC_LINKS.find((topic) => topic.slug === normalizeTopicSlug(slug));

const topicLabel = (slug = "") =>
  getTopic(slug)?.navLabel || String(slug).replace(/-/g, " ");

const absoluteUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, BLOG_PUBLIC_URL);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const seoImage = (value = "") => absoluteUrl(value) || DEFAULT_OG_IMAGE;

const imageAlt = (image = {}, fallback = "Vidhgrow blog image") =>
  String(image?.alt || fallback).trim() || fallback;

const truncateMeta = (value = "", maxLength = 138) => {
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
  const base = truncateMeta(value || fallback, 138);
  if (base.length >= 120) return base;
  return truncateMeta(
    `${base} Read more Vidhgrow blogs on online learning, teacher workflows, course creation, student practice, and platform updates.`,
    138,
  );
};

const wordCountFromHtml = (html = "") => {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

const readingTimeMinutes = (post = {}, html = "") => {
  const bodyWords = html ? wordCountFromHtml(html) : 0;
  const storedWords = Number(post.wordCount || 0);
  const previewWords = wordCountFromHtml(`${post.title || ""} ${post.excerpt || ""} ${(post.tags || []).join(" ")}`);
  const words = bodyWords || storedWords || previewWords;
  return Math.max(1, Math.ceil(words / 220));
};

const readingTimeLabel = (post = {}, html = "") => {
  const minutes = readingTimeMinutes(post, html);
  return `${minutes} min read`;
};

const paragraphCountFromHtml = (html = "") =>
  (String(html).match(/<p[\s>]/gi) || []).length;

const STOP_WORDS = new Set([
  "and",
  "are",
  "for",
  "from",
  "how",
  "into",
  "news",
  "not",
  "the",
  "this",
  "that",
  "with",
  "you",
  "your",
]);

const importantTerms = (value = "") =>
  stripHtml(value)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

const missingImportantTerms = (source = "", target = "") => {
  const targetTerms = new Set(importantTerms(target));
  return [...new Set(importantTerms(source))].filter((term) => !targetTerms.has(term));
};

const ensureContentImageAlts = (html = "", fallback = "Vidhgrow blog illustration") => {
  const alt = escapeHtml(fallback);
  return String(html)
    .replace(/<img\b(?![^>]*\balt=)([^>]*)>/gi, `<img alt="${alt}"$1>`)
    .replace(/<img\b([^>]*?)\s+alt=(["'])\s*\2([^>]*)>/gi, `<img$1 alt="${alt}"$3>`);
};

const readableUrlLabel = (href = "") => {
  try {
    const parsed = new URL(String(href), BLOG_PUBLIC_URL);
    const pathLabel = decodeURIComponent(parsed.pathname || "")
      .replace(/^\/|\/$/g, "")
      .replace(/[-_/]+/g, " ")
      .trim();
    const hostLabel = parsed.hostname.replace(/^www\./, "");
    return pathLabel ? `${pathLabel} on ${hostLabel}` : hostLabel;
  } catch {
    return "Read linked page";
  }
};

const ensureReadableArticleLinks = (html = "") =>
  String(html).replace(/<a\b([^>]*\bhref=(["'])([^"']+)\2[^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, _quote, href, inner) => {
    if (stripHtml(inner)) return match;

    const label = escapeHtml(readableUrlLabel(href));
    if (/<img\b/i.test(inner)) {
      return `<a${attrs}>${inner}<span class="sr-only">${label}</span></a>`;
    }
    return `<a${attrs}>${label}</a>`;
  });

const prepareArticleContentHtml = (html = "", fallback = "Vidhgrow blog illustration") =>
  ensureReadableArticleLinks(ensureContentImageAlts(html, fallback));

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

const apiCache = new Map();
const pageCache = new Map();

const readTimedCache = (cache, key) => {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

const writeTimedCache = (cache, key, value, ttlMs) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

const cached = async (cache, key, ttlMs, loader) => {
  const existing = readTimedCache(cache, key);
  if (existing) return existing;
  const value = await loader();
  return writeTimedCache(cache, key, value, ttlMs);
};

const fetchJson = async (apiPath, options = {}) => {
  const cachedJson = readTimedCache(apiCache, apiPath);
  if (cachedJson) return cachedJson;

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

  const json = await response.json();
  return writeTimedCache(apiCache, apiPath, json, options.ttlMs ?? API_CACHE_TTL_MS);
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
      profileUrl: `${PUBLIC_API_BASE}/api/auth/profile`,
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
    ${TOPIC_LINKS.slice(0, 3)
      .map((topic) => `<a href="/topic/${topic.slug}">${escapeHtml(topic.navLabel)}</a>`)
      .join("")}
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

const postCardAuthor = (post = {}) => {
  const name = post.author?.name || "Vidhgrow Editorial";
  return post.author?.slug
    ? `<a href="/author/${escapeHtml(post.author.slug)}">${escapeHtml(name)}</a>`
    : `<span>${escapeHtml(name)}</span>`;
};

const postCard = (post) => `<article class="post-card">
  <a href="/${escapeHtml(post.slug)}" class="post-card-image">
    <img src="${escapeHtml(seoImage(post.coverImage?.url))}" alt="${escapeHtml(imageAlt(post.coverImage, `Cover image for ${post.title}`))}" loading="lazy" />
  </a>
  <div class="post-card-copy">
    <time datetime="${escapeHtml(post.publishedAt || post.createdAt)}">${formatDate(post.publishedAt || post.createdAt)}</time>
    <h2><a href="/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a></h2>
    <p>${escapeHtml(post.excerpt)}</p>
    <div class="post-meta">
      ${postCardAuthor(post)}
      <span>${escapeHtml(readingTimeLabel(post))}</span>
    </div>
  </div>
</article>`;

const filterPostsForTopic = (posts = [], topic) => {
  if (!topic) return posts;
  const terms = topic.terms.map((term) => term.toLowerCase());
  return posts.filter((post) =>
    [post.title, post.excerpt, post.category, post.author?.name, ...(post.topics || []), ...(post.tags || [])]
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .some((word) => terms.some((term) => word.includes(term))),
  );
};

const renderHome = async (url) => {
  const query = sanitizeSearchQuery(url.searchParams.get("q") || "");
  const queryNeedle = query.toLowerCase();
  const [postsRes, settingsRes] = await Promise.all([
    fetchJson("/api/blogs/public?limit=24&fresh=1", { ttlMs: LIST_API_CACHE_TTL_MS }),
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
  const listedPosts = latest && !query ? posts.slice(1) : posts;
  const body = `${header()}
<main id="main" class="home-shell">
  ${renderArticleAmbient()}
  <section class="home-intro">
    <div class="home-copy">
      <p class="eyebrow">Vidhgrow Blogs</p>
      <h1>Vidhgrow Blogs for product updates, teaching workflows, and course news.</h1>
      <p class="lede">Follow product updates, teacher workflows, course improvements, assessment design, and platform decisions from the Vidhgrow team.</p>
      <div class="topic-links" aria-label="Editorial topics">
        ${INTRO_LINKS.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
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
  <section class="editorial-note" aria-labelledby="editorial-title">
    <p class="eyebrow">Why this blog exists</p>
    <h2 id="editorial-title">Product updates and teaching notes for serious practice</h2>
    <p>Vidhgrow Blogs is where we explain the platform work behind better online learning. The writing covers product updates, teaching workflows, course news, assessment notes, security decisions, and the small interface changes that make daily practice easier for students and teachers.</p>
    <p>Every post is written to be useful before it is promotional. When we ship a course builder improvement, a teacher profile change, a document verification update, or a student feedback feature, we explain what changed, who it helps, and how it fits into serious practice on Vidhgrow.</p>
    <p>The blog also gives search engines and readers a stable place to understand our product direction. You will find course creation notes, teacher portal decisions, exam strategy ideas, student progress improvements, admin workflow updates, and practical context for new Vidhgrow releases.</p>
    <p>Use these blogs to follow the platform, compare recent feature work, and understand how Vidhgrow is building a calmer learning system around courses, tests, feedback, completion signals, and trusted teacher-led education.</p>
  </section>
  ${
    latest && !query
      ? `<section class="featured-post">
          <a href="/${escapeHtml(latest.slug)}"><img src="${escapeHtml(seoImage(latest.coverImage?.url))}" alt="${escapeHtml(imageAlt(latest.coverImage, `Featured cover for ${latest.title}`))}" /></a>
          <div>
            <p class="section-kicker">Latest story</p>
            <time datetime="${escapeHtml(latest.publishedAt || latest.createdAt)}">${formatDate(latest.publishedAt || latest.createdAt)}</time>
            <h2><a href="/${escapeHtml(latest.slug)}">${escapeHtml(latest.title)}</a></h2>
            <p>${escapeHtml(latest.excerpt)}</p>
            <div class="post-meta">${postCardAuthor(latest)}<span>${escapeHtml(readingTimeLabel(latest))}</span></div>
          </div>
        </section>`
      : ""
  }
  <div class="section-heading">
    <p class="eyebrow">${query ? "Search results" : "Platform notes"}</p>
    <h2>${query ? `Posts matching "${escapeHtml(query)}"` : "Blog updates, features, and practical decisions from Vidhgrow."}</h2>
  </div>
  <section class="post-list" aria-label="Blog posts">
    ${listedPosts.map(postCard).join("") || `<div class="empty-state">No posts found.</div>`}
  </section>
  <section class="browse-links" aria-labelledby="browse-title">
    <div>
      <p class="eyebrow">Browse</p>
      <h2 id="browse-title">Explore Vidhgrow blog topics</h2>
    </div>
    <nav aria-label="More blog topics">
      ${BROWSE_LINKS.map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`).join("")}
    </nav>
  </section>
  <section class="reference-links" aria-labelledby="reference-title">
    <div>
      <p class="eyebrow">References</p>
      <h2 id="reference-title">Useful reading beyond Vidhgrow</h2>
      <p>These external resources help readers understand how structured content, search visibility, and readable product writing fit together.</p>
    </div>
    <nav aria-label="External SEO and publishing resources">
      ${EXTERNAL_READING_LINKS.map(
        ([label, href]) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
      ).join("")}
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

const topicPageTitle = (topic) =>
  metaTitle(`${topic.title} | Vidhgrow Topic Archive`, HOME_SEO_TITLE);

const topicPageDescription = (topic) =>
  metaDescription(
    `${topic.description} Browse Vidhgrow blog articles about ${topic.navLabel.toLowerCase()}, platform news, teacher workflows, course updates, student practice, and product decisions.`,
    HOME_SEO_DESCRIPTION,
  );

const renderTopicOverview = (topic, posts = []) => {
  const focusTerms = topic.terms.slice(0, 4).join(", ");
  const postSummary = posts.length
    ? `The posts below are ordered by freshness, so readers can start with recent Vidhgrow notes and then move through older context without using filtered URLs or temporary query parameters.`
    : `When new writing is published in this topic, it will appear here on a stable URL that can be linked from search, newsletters, product pages, and related Vidhgrow blog posts.`;

  return `<section class="topic-overview" aria-labelledby="topic-overview-title">
    <p class="eyebrow">Topic guide</p>
    <h2 id="topic-overview-title">How to use this Vidhgrow topic archive</h2>
    <p>The ${escapeHtml(topic.title)} archive brings together Vidhgrow writing about ${escapeHtml(focusTerms)} and the practical decisions behind the platform. It is designed for readers who want more than a headline: what changed, why the team made the change, and how the update affects teachers, students, course builders, and admins using Vidhgrow every day.</p>
    <p>${escapeHtml(topic.description)} The page also gives crawlers a clean collection page for related blogs, with stable internal links to posts, other topic archives, and author pages. That keeps the browsing path simple for humans while making the structure easier for search engines and AI assistants to understand.</p>
    <p>${postSummary} Each article should connect back to real product work, such as course creation, teacher verification, assessment quality, student progress, feedback, moderation, security, or publishing workflows. We avoid filler and keep the archive focused on notes that help someone understand the Vidhgrow product and learning experience.</p>
    <p>Use this page as a starting point when comparing Vidhgrow feature releases, reading teacher portal updates, reviewing course builder changes, or following how the platform is improving online learning. For wider context, continue through the related topics below or open the linked author profiles from the article cards.</p>
  </section>`;
};

const renderTopic = async (slug) => {
  const topic = getTopic(slug);
  if (!topic) {
    const error = new Error("Topic not found");
    error.status = 404;
    throw error;
  }

  const [postsRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/public?limit=24&topic=${encodeURIComponent(topic.slug)}&fresh=1`, { ttlMs: LIST_API_CACHE_TTL_MS }),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const posts = postsRes.data.posts?.length
    ? postsRes.data.posts
    : filterPostsForTopic(postsRes.data.posts || [], topic);
  const body = `${header()}
<main id="main" class="home-shell topic-shell">
  ${renderArticleAmbient()}
  <section class="topic-hero">
    <p class="eyebrow">Vidhgrow topic</p>
    <h1>${escapeHtml(topic.title)}</h1>
    <p class="lede">${escapeHtml(topic.description)}</p>
    <p>These articles collect related Vidhgrow blog updates in one clean place, without dynamic search parameters. The page helps readers and crawlers follow a stable topic path for ${escapeHtml(topic.navLabel.toLowerCase())}, platform improvements, and practical online learning decisions.</p>
  </section>
  ${renderTopicOverview(topic, posts)}
  <section class="post-list" aria-label="${escapeHtml(topic.title)} posts">
    ${posts.map(postCard).join("") || `<div class="empty-state">No posts found for this topic yet.</div>`}
  </section>
  <section class="browse-links" aria-labelledby="topic-browse-title">
    <div>
      <p class="eyebrow">More topics</p>
      <h2 id="topic-browse-title">Continue through Vidhgrow Blogs</h2>
    </div>
    <nav aria-label="Other blog topics">
      ${BROWSE_LINKS.filter(([, href]) => href !== `/topic/${topic.slug}`)
        .map(([label, href]) => `<a href="${href}">${escapeHtml(label)}</a>`)
        .join("")}
    </nav>
  </section>
</main>
${footer(settingsRes.data)}`;

  return pageShell({
    title: topicPageTitle(topic),
    description: topicPageDescription(topic),
    canonical: `${BLOG_PUBLIC_URL}/topic/${topic.slug}`,
    image: posts[0]?.coverImage?.url,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: topic.title,
      description: topic.description,
      url: `${BLOG_PUBLIC_URL}/topic/${topic.slug}`,
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
  <p class="comments-note">Comments use your existing Vidhgrow account. One top-level comment per user, 100 characters max.</p>
  <div class="comment-auth" data-auth-panel>
    <span data-auth-state>Checking Vidhgrow login...</span>
    <a data-login-link href="https://vidhgrow.online/login">Log in to comment</a>
  </div>
  <form class="comment-form" data-post-id="${escapeHtml(post._id)}">
    <textarea name="content" maxlength="100" rows="3" placeholder="Write a short comment" disabled></textarea>
    <div class="comment-actions"><span data-counter>0/100</span><button type="submit" disabled>Post comment</button></div>
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
            <textarea name="content" maxlength="100" rows="2" placeholder="Reply to your comment" disabled></textarea>
            <div class="comment-actions"><span data-counter>0/100</span><button type="submit" disabled>Reply</button></div>
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
              <img src="${escapeHtml(seoImage(post.coverImage?.url))}" alt="${escapeHtml(imageAlt(post.coverImage, `Related cover for ${post.title}`))}" loading="lazy" />
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

const renderTopicPills = (topics = []) => {
  const cleanTopics = [...new Set((topics || []).map(normalizeTopicSlug).filter(Boolean))].filter(getTopic);
  if (!cleanTopics.length) return "";

  return `<nav class="article-topics" aria-label="Blog topics">
    ${cleanTopics
      .map((topic) => `<a href="/topic/${escapeHtml(topic)}">${escapeHtml(topicLabel(topic))}</a>`)
      .join("")}
  </nav>`;
};

const renderArticleContext = (post, contentHtml = "") => {
  const bodyWordCount = wordCountFromHtml(contentHtml);
  const bodyParagraphCount = paragraphCountFromHtml(contentHtml);
  const title = post.title || "this Vidhgrow update";
  const seoTitle = post.seo?.metaTitle && post.seo.metaTitle !== title ? post.seo.metaTitle : "";
  const visibleContext = `${title} ${post.excerpt || ""} ${post.category || ""} ${(post.tags || []).join(" ")} ${contentHtml}`;
  const missingSeoTerms = missingImportantTerms(post.seo?.metaTitle || title, visibleContext);
  if (bodyWordCount >= 250 && bodyParagraphCount >= 3 && !missingSeoTerms.length) return "";

  const category = post.category || "platform";
  const tags = (post.tags || []).slice(0, 4).filter(Boolean);
  const tagText = tags.length ? tags.join(", ") : "online learning, course creation, and student practice";

  return `<section class="article-context" aria-labelledby="article-context-title">
    <p class="eyebrow">Article context</p>
    <h2 id="article-context-title">More context on ${escapeHtml(title)}</h2>
    <p>This Vidhgrow blog covers ${escapeHtml(title)} in the context of ${escapeHtml(category)} work, teaching workflows, course updates, student practice, and platform improvements.</p>
    ${seoTitle ? `<p>Another way to read this piece is as a note on ${escapeHtml(seoTitle)}, with the details tied back to daily Vidhgrow work and reader questions.</p>` : ""}
    <p>The note is connected to ${escapeHtml(tagText)} so readers can understand how the update fits into the wider Vidhgrow product and learning experience.</p>
    <p>If you are comparing Vidhgrow feature releases, teacher portal changes, assessment updates, or course builder improvements, this article gives the practical background behind the change.</p>
    <p>For readers coming from search, this context also makes the page easier to scan before moving into related blogs, author notes, comments, or future Vidhgrow platform updates.</p>
  </section>`;
};

const renderArticleAmbient = () => `<div class="article-ambient blog-ambient" aria-hidden="true">
  <span class="ambient-field ambient-field-one" data-parallax="0.015" data-parallax-x="-0.012"></span>
  <span class="ambient-field ambient-field-two" data-parallax="-0.018" data-parallax-x="0.01"></span>
  <span class="ambient-field ambient-field-three" data-parallax="0.022" data-parallax-x="-0.006"></span>
  <span class="ambient-rule ambient-rule-one" data-parallax="-0.035" data-parallax-x="0.018"></span>
  <span class="ambient-rule ambient-rule-two" data-parallax="0.04" data-parallax-x="-0.012"></span>
  <span class="ambient-rule ambient-rule-three" data-parallax="-0.028" data-parallax-x="0.014"></span>
  <span class="ambient-icon ambient-brain" data-parallax="0.05" data-parallax-x="-0.018">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M18 10c-4 0-7 3-7 7 0 1 .2 2 .6 3A8 8 0 0 0 8 27c0 5 4 9 9 9h2V10h-1Zm12 0c4 0 7 3 7 7 0 1-.2 2-.6 3A8 8 0 0 1 40 27c0 5-4 9-9 9h-2V10h1ZM19 18h-4m4 8h-5m15-8h4m-4 8h5"/></svg>
  </span>
  <span class="ambient-icon ambient-news" data-parallax="-0.04" data-parallax-x="0.012">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M10 14h24v22H10zM34 20h4v16c0 3-2 5-5 5H15M15 20h14M15 26h14M15 32h9"/></svg>
  </span>
  <span class="ambient-icon ambient-pen" data-parallax="0.03" data-parallax-x="-0.01">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M12 36l4-11 16-16 7 7-16 16-11 4Zm18-25 7 7M16 25l7 7"/></svg>
  </span>
  <span class="ambient-icon ambient-comment" data-parallax="-0.06" data-parallax-x="0.02">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M12 14h24v18H20l-8 6V14Zm7 7h16M19 27h10"/></svg>
  </span>
  <span class="ambient-icon ambient-chart" data-parallax="0.08" data-parallax-x="-0.014">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M10 38h28M15 34V22m9 12V14m9 20V26M12 12h24v26H12z"/></svg>
  </span>
  <span class="ambient-icon ambient-book" data-parallax="-0.03" data-parallax-x="0.009">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M12 12h11c3 0 5 2 5 5v21c0-3-2-5-5-5H12V12Zm24 0H25c-3 0-5 2-5 5v21c0-3 2-5 5-5h11V12Z"/></svg>
  </span>
  <span class="ambient-icon ambient-bell" data-parallax="0.04" data-parallax-x="-0.016">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M18 37h12m-8 4h4m10-8H12l4-5v-7c0-5 3-9 8-9s8 4 8 9v7l4 5Z"/></svg>
  </span>
  <span class="ambient-icon ambient-globe" data-parallax="-0.05" data-parallax-x="0.015">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32Zm-14-16h28M24 8c4 4 6 9 6 16s-2 12-6 16M24 8c-4 4-6 9-6 16s2 12 6 16"/></svg>
  </span>
  <span class="ambient-icon ambient-megaphone" data-parallax="0.072" data-parallax-x="-0.02">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M13 28h7l16 7V13l-16 7h-7v8Zm7 0 3 9h-6l-2-9m21-12 4-3m-4 19 4 3M38 24h5"/></svg>
  </span>
  <span class="ambient-icon ambient-rss" data-parallax="-0.07" data-parallax-x="0.018">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M14 34h.1M14 24c6 0 10 4 10 10M14 14c12 0 20 8 20 20"/></svg>
  </span>
  <span class="ambient-icon ambient-search" data-parallax="0.052" data-parallax-x="-0.012">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M22 34a12 12 0 1 0 0-24 12 12 0 0 0 0 24Zm9-3 9 9M17 22h10"/></svg>
  </span>
  <span class="ambient-icon ambient-calendar" data-parallax="-0.045" data-parallax-x="0.014">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M13 14h22v24H13zM13 20h22M18 10v8m12-8v8M18 27h4m6 0h4m-14 6h4m6 0h4"/></svg>
  </span>
  <span class="ambient-icon ambient-clipboard" data-parallax="0.065" data-parallax-x="-0.017">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M17 12h14l2 5H15l2-5Zm-3 5h20v23H14V17Zm6 9h10m-10 7h10"/></svg>
  </span>
  <span class="ambient-icon ambient-target" data-parallax="-0.058" data-parallax-x="0.02">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32Zm0-6a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg>
  </span>
  <span class="ambient-icon ambient-lightbulb" data-parallax="0.038" data-parallax-x="-0.01">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M18 34h12m-10 5h8m-4-31a12 12 0 0 0-7 22c1 1 1 2 1 4h12c0-2 0-3 1-4A12 12 0 0 0 24 8Zm0 0v5m-12 7H8m32 0h-4M14 12l-3-3m23 3 3-3"/></svg>
  </span>
  <span class="ambient-icon ambient-layers" data-parallax="-0.032" data-parallax-x="0.012">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M24 8 8 17l16 9 16-9-16-9Zm-12 17 12 7 12-7M12 33l12 7 12-7"/></svg>
  </span>
  <span class="ambient-icon ambient-checklist" data-parallax="0.09" data-parallax-x="-0.022">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M15 12h22v28H15zM11 16h4m-4 8h4m-4 8h4m10-14 4 4 7-8m-11 16h11"/></svg>
  </span>
  <span class="ambient-icon ambient-sparkline" data-parallax="-0.082" data-parallax-x="0.018">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M10 36h28M13 31l7-8 6 5 10-14m0 0v8m0-8h-8"/></svg>
  </span>
  <span class="ambient-icon ambient-compass" data-parallax="0.047" data-parallax-x="-0.016">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32Zm6-22-4 10-10 4 4-10 10-4Z"/></svg>
  </span>
  <span class="ambient-icon ambient-window" data-parallax="-0.062" data-parallax-x="0.016">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M10 12h28v24H10zM10 19h28M16 15h.1M21 15h.1M26 15h.1M16 26h16M16 31h10"/></svg>
  </span>
  <span class="ambient-icon ambient-cap" data-parallax="0.055" data-parallax-x="-0.014">
    <svg viewBox="0 0 48 48" focusable="false"><path d="M24 10 8 18l16 8 16-8-16-8Zm-10 12v8c5 5 15 5 20 0v-8M40 18v12"/></svg>
  </span>
</div>`;

const renderArticleEnding = (post) => `<section class="article-ending" aria-label="End of article">
  <span class="ending-rule"></span>
  <div>
    <p class="eyebrow">End of blog</p>
    <h2>${escapeHtml(post.title)} continues through related notes and reader comments.</h2>
    <p>Keep going with connected Vidhgrow stories below, or use the comments section to add a short response from your account.</p>
    <div>
      <a href="#related-title">Related blogs</a>
      <a href="#comments-title">Comments</a>
    </div>
  </div>
</section>`;

const renderPost = async (slug) => {
  const [postRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/public/${encodeURIComponent(slug)}`),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { post, comments, relatedPosts } = postRes.data;
  const defaultCanonical = `${BLOG_PUBLIC_URL}/${post.slug}`;
  const canonical = absoluteUrl(post.seo?.canonicalUrl) || defaultCanonical;
  const title = metaTitle(post.seo?.metaTitle || post.title, post.title);
  const description = metaDescription(post.seo?.metaDescription || post.excerpt, post.excerpt || post.plainTextPreview);
  const social = settingsRes.data?.socialMedia || {};
  const shareUrl = canonical;
  const shareTitle = post.social?.shareTitle || post.title;
  const coverUrl = seoImage(post.coverImage?.url);
  const coverAlt = imageAlt(post.coverImage, `${post.title} cover image`);
  const contentHtml = prepareArticleContentHtml(post.contentHtml, post.title);
  const readTime = readingTimeLabel(post, contentHtml);
  const articleContext = renderArticleContext(post, contentHtml);

  const body = `${header()}
<main id="main" class="article-shell">
  ${renderArticleAmbient()}
  <article class="article">
    <nav class="article-breadcrumb" aria-label="Breadcrumb">
      <a href="/">Blogs</a>
      <span aria-hidden="true">&gt;</span>
      <span>${escapeHtml(post.title)}</span>
    </nav>
    <p class="eyebrow">${escapeHtml(post.category || "learning")}</p>
    <h1>${escapeHtml(post.title)}</h1>
    ${renderTopicPills(post.topics)}
    <p class="article-excerpt">${escapeHtml(post.excerpt)}</p>
    <div class="article-byline">
      ${renderAuthorAvatar(post.author)}
      <div>
        <a href="/author/${escapeHtml(post.author?.slug || "")}">${escapeHtml(post.author?.name || "Vidhgrow Editorial")}</a>
        <span>${formatDate(post.publishedAt || post.createdAt)} · ${escapeHtml(readTime)}</span>
      </div>
    </div>
    <img class="article-cover" src="${escapeHtml(coverUrl)}" alt="${escapeHtml(coverAlt)}" />
    <div class="article-content">${contentHtml}</div>
    ${articleContext}
    ${renderArticleEnding(post)}
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

const renderAuthorOverview = (author = {}, posts = []) => {
  const name = author.name || "Vidhgrow Editorial";
  const role = author.title || "Vidhgrow blog author";
  const topicNames = [
    ...new Set(
      posts
        .flatMap((post) => post.topics || [])
        .map((topic) => topicLabel(topic))
        .filter(Boolean),
    ),
  ].slice(0, 4);
  const topicText = topicNames.length
    ? topicNames.join(", ")
    : "product updates, teaching workflows, course news, student practice, and platform operations";
  const postCountText = posts.length
    ? `${posts.length} published ${posts.length === 1 ? "blog" : "blogs"}`
    : "upcoming Vidhgrow blogs";

  return `<section class="author-overview" aria-labelledby="author-overview-title">
    <p class="eyebrow">Author profile</p>
    <h2 id="author-overview-title">Editorial notes from ${escapeHtml(name)}</h2>
    <p>${escapeHtml(name)} is listed on Vidhgrow Blogs as ${escapeHtml(role)}, with writing connected to ${escapeHtml(topicText)}. This author page gives readers and search engines a clear place to understand the voice behind the posts, the subjects covered, and the way each article fits into the wider Vidhgrow learning platform.</p>
    <p>The archive currently includes ${escapeHtml(postCountText)}. Each article should explain real platform work in plain language: what changed, why it matters, who it helps, and what teachers, students, admins, or course builders should notice next. That makes the page useful for readers who want product context instead of scattered updates.</p>
    <p>Author pages are also part of the blog trust model. They connect post cards, related articles, topic archives, comments, and social sharing back to a stable profile. When Vidhgrow publishes product news, teacher portal changes, course builder notes, security updates, feedback improvements, or student progress stories, the author profile helps readers follow that work over time.</p>
    <p>Use the article list below to move through recent writing from ${escapeHtml(name)}, then continue into the linked topic pages for broader Vidhgrow blog coverage. The page stays simple on purpose: a clear author identity, readable archive links, and enough context for search crawlers, AI assistants, and human readers to understand the publishing trail.</p>
  </section>`;
};

const renderAuthor = async (slug) => {
  const [authorRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/authors/${encodeURIComponent(slug)}`),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { author, posts = [] } = authorRes.data;
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
  ${renderAuthorOverview(author, posts || [])}
  <section class="post-list">${posts.map(postCard).join("")}</section>
</main>
  ${footer(settingsRes.data)}`;
  return pageShell({
    title: metaTitle(`${author.name} - Vidhgrow Blog Author Archive`, author.name),
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

const renderLlmsTxt = () => `# Vidhgrow Blogs

Official blog for Vidhgrow product updates, teaching workflows, course news, assessment notes, student progress, security updates, admin workflows, and feedback notes.

Primary site: ${BLOG_PUBLIC_URL}
Sitemap: ${BLOG_PUBLIC_URL}/sitemap.xml
RSS feed: ${BLOG_PUBLIC_URL}/feed.xml
Robots: ${BLOG_PUBLIC_URL}/robots.txt

Important public sections:
${TOPIC_LINKS.map((topic) => `- ${topic.title}: ${BLOG_PUBLIC_URL}/topic/${topic.slug}`).join("\n")}

Use the canonical URLs on each page. Public blog pages are server-rendered HTML with article content, topic links, author links, structured data, Open Graph metadata, and readable comments. Admin-only blog APIs, unpublished drafts, upload URLs, encrypted records, and private Vidhgrow application APIs are not intended for model ingestion.
`;

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
    ...securityHeaders(),
  });
  res.end(content);
};

const redirectToCanonicalHost = (req, res) => {
  const canonicalHost = new URL(BLOG_PUBLIC_URL).host.toLowerCase();
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const requestHost = forwardedHost.startsWith("[")
    ? forwardedHost
    : forwardedHost.replace(/:\d+$/, "");

  if (!requestHost || requestHost.includes("localhost") || requestHost === canonicalHost) {
    return false;
  }

  if (requestHost === `www.${canonicalHost}` || requestHost.replace(/^www\./, "") === canonicalHost) {
    const target = `${BLOG_PUBLIC_URL}${req.url || "/"}`;
    res.writeHead(301, {
      Location: target,
      "Cache-Control": "public, max-age=3600",
      ...securityHeaders(),
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
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() });
      return res.end("google-site-verification: google71d3fdc4e5a7d6ef.html");
    }
    if (BLOG_INDEXNOW_KEY && pathname === `/${BLOG_INDEXNOW_KEY}.txt`) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders() });
      return res.end(BLOG_INDEXNOW_KEY);
    }
    if (pathname === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders() });
      return res.end(`User-agent: *
Allow: /
Sitemap: ${BLOG_PUBLIC_URL}/sitemap.xml
`);
    }
    if (pathname === "/llms.txt") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", ...securityHeaders() });
      return res.end(renderLlmsTxt());
    }
    if (pathname === "/sitemap.xml") {
      const sitemap = await cached(pageCache, "sitemap", PAGE_CACHE_TTL_MS, async () => {
        const upstream = await fetch(`${API_BASE}/api/blogs/sitemap.xml`, {
        headers: { Origin: BLOG_ORIGIN, Referer: `${BLOG_ORIGIN}/` },
      }).then((r) => r.text());
        const topicUrls = TOPIC_LINKS.map(
          (topic) => `  <url>
    <loc>${BLOG_PUBLIC_URL}/topic/${topic.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
        ).join("\n");
        return upstream.includes("</urlset>")
          ? upstream.replace("</urlset>", `${topicUrls}\n</urlset>`)
          : upstream;
      });
      res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", ...securityHeaders() });
      return res.end(sitemap);
    }
    if (pathname === "/feed.xml") {
      res.writeHead(200, { "Content-Type": "application/rss+xml; charset=utf-8", ...securityHeaders() });
      return res.end(await renderFeed());
    }

    let html;
    if (pathname === "/") {
      html = await cached(pageCache, `home:${url.search}`, HOME_PAGE_CACHE_TTL_MS, () => renderHome(url));
    } else if (pathname.startsWith("/topic/")) {
      const slug = pathname.replace("/topic/", "");
      html = await cached(pageCache, `topic:${slug}`, HOME_PAGE_CACHE_TTL_MS, () => renderTopic(slug));
    } else if (pathname.startsWith("/author/")) {
      const slug = pathname.replace("/author/", "");
      html = await cached(pageCache, `author:${slug}`, PAGE_CACHE_TTL_MS, () => renderAuthor(slug));
    } else if (/^\/[a-z0-9-]+$/.test(pathname)) {
      const slug = pathname.slice(1);
      html = await cached(pageCache, `post:${slug}`, PAGE_CACHE_TTL_MS, () => renderPost(slug));
    } else {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() });
      return res.end(render404());
    }

    const htmlCacheControl =
      pathname === "/" || pathname.startsWith("/topic/")
        ? "public, max-age=30, stale-while-revalidate=120"
        : "public, max-age=120, stale-while-revalidate=600";

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": htmlCacheControl,
      ...securityHeaders(),
    });
    res.end(html);
  } catch (error) {
    if (error.status === 404) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() });
      return res.end(render404());
    }
    console.error("[BLOGS_SSR] Render error:", error);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() });
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
