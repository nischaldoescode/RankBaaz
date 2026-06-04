/**
 * keeps the server module focused and readable.
 */
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
      "accept-language": "en-us,en;q=0.9",
      "accept-encoding": "gzip, deflate, br",
      origin: blog_origin,
      referer: `${blog_origin}/`,
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "user-agent": "vidhgrowblogsssr/1.0",
    },
  });

  if (!response.ok) {
    const error = error(`api ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const json = await response.json();
  return writetimedcache(apicache, apipath, json, options.ttlms ?? api_cache_ttl_ms);
};

const pageshell = ({
  title,
  description,
  canonical,
  image,
  ogtype = "website",
  robots = "index,follow,max-image-preview:large",
  body,
  jsonld,
}) => {
  const shareimage = seoimage(image);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#3b82f6" />
  <title>${escapehtml(title)}</title>
  <meta name="description" content="${escapehtml(description)}" />
  <meta name="robots" content="${escapehtml(robots)}" />
  <link rel="canonical" href="${escapehtml(canonical)}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:locale" content="en_us" />
  <meta property="og:type" content="${escapehtml(ogtype)}" />
  <meta property="og:site_name" content="vidhgrow blogs" />
  <meta property="og:title" content="${escapehtml(title)}" />
  <meta property="og:description" content="${escapehtml(description)}" />
  <meta property="og:url" content="${escapehtml(canonical)}" />
  <meta property="og:image" content="${escapehtml(shareimage)}" />
  <meta property="og:image:secure_url" content="${escapehtml(shareimage)}" />
  <meta property="og:image:alt" content="${escapehtml(title)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapehtml(title)}" />
  <meta name="twitter:description" content="${escapehtml(description)}" />
  <meta name="twitter:image" content="${escapehtml(shareimage)}" />
  <meta name="twitter:image:alt" content="${escapehtml(title)}" />
  <link rel="alternate" type="application/rss+xml" title="vidhgrow blogs" href="${blog_public_url}/feed.xml" />
  <link rel="stylesheet" href="/assets/styles.css" />
  ${jsonld ? `<script type="application/ld+json">${json.stringify(jsonld)}</script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">skip to content</a>
  ${body}
  <script>
    window.__blog_config__ = ${json.stringify({
      apibase: public_api_base,
      loginurl: "https://vidhgrow.online/login",
      profileurl: `${public_api_base}/api/auth/profile`,
    })};
  </script>
  <script src="/assets/app.js" defer></script>
</body>
</html>`;
};

const header = () => `<header class="site-header">
  <a class="wordmark" href="/">
    <img src="/logo.png" alt="vidhgrow blogs logo" width="40" height="40" />
    <span>vidhgrow <em>blogs</em></span>
  </a>
  <nav aria-label="primary">
    <a href="/">latest</a>
    ${topic_links.slice(0, 3)
      .map((topic) => `<a href="/topic/${topic.slug}">${escapehtml(topic.navlabel)}</a>`)
      .join("")}
    <a href="https://vidhgrow.online">vidhgrow</a>
  </nav>
</header>`;

const footer = (settings = {}) => {
  const social = settings.socialmedia || {};
  const links = object.entries(social).filter(([, url]) => url);
  return `<footer class="site-footer">
    <div class="footer-copy">
      <strong>vidhgrow blogs</strong>
      <p>product updates, teacher workflows, course builder notes, student practice improvements, and platform decisions from the vidhgrow team.</p>
      <nav class="footer-nav" aria-label="blog topics">
        ${root_links.map(([label, href]) => `<a href="${href}">${escapehtml(label)}</a>`).join("")}
      </nav>
    </div>
    ${
      links.length
        ? `<div class="footer-links">${links
            .map(([name, url]) => `<a href="${escapehtml(url)}" rel="me noopener noreferrer" target="_blank">${escapehtml(name)}</a>`)
            .join("")}</div>`
        : ""
    }
  </footer>`;
};

const postcardauthor = (post = {}) => {
  const name = post.author?.name || "vidhgrow editorial";
  return post.author?.slug
    ? `<a href="/author/${escapehtml(post.author.slug)}">${escapehtml(name)}</a>`
    : `<span>${escapehtml(name)}</span>`;
};

const postcard = (post) => `<article class="post-card">
  <a href="/${escapehtml(post.slug)}" class="post-card-image">
    <img src="${escapehtml(seoimage(post.coverimage?.url))}" alt="${escapehtml(imagealt(post.coverimage, `cover image for ${post.title}`))}" loading="lazy" />
  </a>
  <div class="post-card-copy">
    <time datetime="${escapehtml(post.publishedat || post.createdat)}">${formatdate(post.publishedat || post.createdat)}</time>
    <h2><a href="/${escapehtml(post.slug)}">${escapehtml(post.title)}</a></h2>
    <p>${escapehtml(post.excerpt)}</p>
    <div class="post-meta">
      ${postcardauthor(post)}
      <span>${escapehtml(readingtimelabel(post))}</span>
    </div>
  </div>
</article>`;

const filterpostsfortopic = (posts = [], topic) => {
  if (!topic) return posts;
  const terms = topic.terms.map((term) => term.tolowercase());
  return posts.filter((post) =>
    [post.title, post.excerpt, post.category, post.author?.name, ...(post.topics || []), ...(post.tags || [])]
      .join(" ")
      .tolowercase()
      .split(/\s+/)
      .some((word) => terms.some((term) => word.includes(term))),
  );
};

const renderhome = async (url) => {
  const query = sanitizesearchquery(url.searchparams.get("q") || "");
  const queryneedle = query.tolowercase();
  const [postsres, settingsres] = await promise.all([
    fetchjson("/api/blogs/public?limit=24&fresh=1", { ttlms: list_api_cache_ttl_ms }),
    fetchjson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  let posts = postsres.data.posts || [];

  if (query) {
    posts = posts.filter((post) =>
      [post.title, post.excerpt, post.author?.name, ...(post.tags || [])]
        .join(" ")
        .tolowercase()
        .includes(queryneedle),
    );
  }

  const latest = posts[0];
  const listedposts = latest && !query ? posts.slice(1) : posts;
  const body = `${header()}
<main id="main" class="home-shell">
  ${renderarticleambient()}
  <section class="home-intro">
    <div class="home-copy">
      <p class="eyebrow">vidhgrow blogs</p>
      <h1>vidhgrow blogs for product updates, teaching workflows, and course s.</h1>
      <p class="lede">follow product updates, teacher workflows, course improvements, assessment design, and platform decisions from the vidhgrow team.</p>
      <div class="topic-links" aria-label="editorial topics">
        ${intro_links.map(([label, href]) => `<a href="${href}">${escapehtml(label)}</a>`).join("")}
      </div>
    </div>
    <form class="search-form" method="get" action="/">
      <label for="q">search posts</label>
      <div>
        <input id="q" name="q" value="${escapehtml(query)}" placeholder="search updates..." maxlength="80" autocomplete="off" />
        <button type="submit">search</button>
      </div>
    </form>
  </section>
  <section class="s-strip" aria-label="what we publish">
    <article><span>01</span><strong>product releases</strong><p>clear notes on what d, why it matters, and where it helps students or teachers.</p></article>
    <article><span>02</span><strong>platform decisions</strong><p>short explanations of the design, security, and workflow choices behind vidhgrow.</p></article>
    <article><span>03</span><strong>practice guidance</strong><p>useful exam, course, and feedback ideas tied to real activity on the platform.</p></article>
  </section>
  <section class="editorial-note" aria-labelledby="editorial-title">
    <p class="eyebrow">why this blog exists</p>
    <h2 id="editorial-title">product updates and teaching notes for serious practice</h2>
    <p>vidhgrow blogs is where we explain the platform work behind better online learning. the writing covers product updates, teaching workflows, course s, assessment notes, security decisions, and the small interface s that make daily practice easier for students and teachers.</p>
    <p>every post is written to be useful it is promotional. when we ship a course builder improvement, a teacher profile , a document verification update, or a student feedback feature, we explain what d, who it helps, and how it fits into serious practice on vidhgrow.</p>
    <p>the blog also gives search engines and readers a stable place to understand our product direction. you will find course creation notes, teacher portal decisions, exam strategy ideas, student progress improvements, admin workflow updates, and practical context for vidhgrow releases.</p>
    <p>use these blogs to follow the platform, compare recent feature work, and understand how vidhgrow is building a calmer learning system around courses, tests, feedback, completion signals, and trusted teacher-led education.</p>
  </section>
  ${
    latest && !query
      ? `<section class="featured-post">
          <a href="/${escapehtml(latest.slug)}"><img src="${escapehtml(seoimage(latest.coverimage?.url))}" alt="${escapehtml(imagealt(latest.coverimage, `featured cover for ${latest.title}`))}" /></a>
          <div>
            <p class="section-kicker">latest story</p>
            <time datetime="${escapehtml(latest.publishedat || latest.createdat)}">${formatdate(latest.publishedat || latest.createdat)}</time>
            <h2><a href="/${escapehtml(latest.slug)}">${escapehtml(latest.title)}</a></h2>
            <p>${escapehtml(latest.excerpt)}</p>
            <div class="post-meta">${postcardauthor(latest)}<span>${escapehtml(readingtimelabel(latest))}</span></div>
          </div>
        </section>`
      : ""
  }
  <div class="section-heading">
    <p class="eyebrow">${query ? "search results" : "platform notes"}</p>
    <h2>${query ? `posts matching "${escapehtml(query)}"` : "blog updates, features, and practical decisions from vidhgrow."}</h2>
  </div>
  <section class="post-list" aria-label="blog posts">
    ${listedposts.map(postcard).join("") || `<div class="empty-state">no posts found.</div>`}
  </section>
  <section class="browse-links" aria-labelledby="browse-title">
    <div>
      <p class="eyebrow">browse</p>
      <h2 id="browse-title">explore vidhgrow blog topics</h2>
    </div>
    <nav aria-label="more blog topics">
      ${browse_links.map(([label, href]) => `<a href="${href}">${escapehtml(label)}</a>`).join("")}
    </nav>
  </section>
  <section class="reference-links" aria-labelledby="reference-title">
    <div>
      <p class="eyebrow">references</p>
      <h2 id="reference-title">useful reading beyond vidhgrow</h2>
      <p>these external resources help readers understand how structured content, search visibility, and readable product writing fit together.</p>
    </div>
    <nav aria-label="external seo and publishing resources">
      ${external_reading_links.map(
        ([label, href]) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${escapehtml(label)}</a>`,
      ).join("")}
    </nav>
  </section>
</main>
${footer(settingsres.data)}`;

  return pageshell({
    title: home_seo_title,
    description: home_seo_description,
    canonical: blog_public_url,
    image: latest?.coverimage?.url,
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "blog",
      name: "vidhgrow blogs",
      description: home_seo_description,
      url: blog_public_url,
    },
  });
};

const topicpagetitle = (topic) =>
  metatitle(`${topic.title} | vidhgrow topic archive`, home_seo_title);

const topicpagedescription = (topic) =>
  metadescription(
    `${topic.description} browse vidhgrow blog articles about ${topic.navlabel.tolowercase()}, platform s, teacher workflows, course updates, student practice, and product decisions.`,
    home_seo_description,
  );

const rendertopicoverview = (topic, posts = []) => {
  const focusterms = topic.terms.slice(0, 4).join(", ");
  const postsummary = posts.length
    ? `the posts below are ordered by freshness, so readers can start with recent vidhgrow notes and then move through older context without using filtered urls or temporary query parameters.`
    : `when writing is published in this topic, it will appear here on a stable url that can be linked from search, sletters, product pages, and related vidhgrow blog posts.`;

  return `<section class="topic-overview" aria-labelledby="topic-overview-title">
    <p class="eyebrow">topic guide</p>
    <h2 id="topic-overview-title">how to use this vidhgrow topic archive</h2>
    <p>the ${escapehtml(topic.title)} archive brings together vidhgrow writing about ${escapehtml(focusterms)} and the practical decisions behind the platform. it is designed for readers who want more than a headline: what d, why the team made the , and how the update affects teachers, students, course builders, and admins using vidhgrow every day.</p>
    <p>${escapehtml(topic.description)} the page also gives crawlers a clean collection page for related blogs, with stable internal links to posts, other topic archives, and author pages. that keeps the browsing path simple for humans while making the structure easier for search engines and ai assistants to understand.</p>
    <p>${postsummary} each article should connect back to real product work, such as course creation, teacher verification, assessment quality, student progress, feedback, moderation, security, or publishing workflows. we avoid filler and keep the archive focused on notes that help someone understand the vidhgrow product and learning experience.</p>
    <p>use this page as a starting point when comparing vidhgrow feature releases, reading teacher portal updates, reviewing course builder s, or following how the platform is improving online learning. for wider context, continue through the related topics below or open the linked author profiles from the article cards.</p>
  </section>`;
};

const rendertopic = async (slug) => {
  const topic = gettopic(slug);
  if (!topic) {
    const error = error("topic not found");
    error.status = 404;
    throw error;
  }

  const [postsres, settingsres] = await promise.all([
    fetchjson(`/api/blogs/public?limit=24&topic=${encodeuricomponent(topic.slug)}&fresh=1`, { ttlms: list_api_cache_ttl_ms }),
    fetchjson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const posts = postsres.data.posts?.length
    ? postsres.data.posts
    : filterpostsfortopic(postsres.data.posts || [], topic);
  const body = `${header()}
<main id="main" class="home-shell topic-shell">
  ${renderarticleambient()}
  <section class="topic-hero">
    <p class="eyebrow">vidhgrow topic</p>
    <h1>${escapehtml(topic.title)}</h1>
    <p class="lede">${escapehtml(topic.description)}</p>
    <p>these articles collect related vidhgrow blog updates in one clean place, without dynamic search parameters. the page helps readers and crawlers follow a stable topic path for ${escapehtml(topic.navlabel.tolowercase())}, platform improvements, and practical online learning decisions.</p>
  </section>
  ${rendertopicoverview(topic, posts)}
  <section class="post-list" aria-label="${escapehtml(topic.title)} posts">
    ${posts.map(postcard).join("") || `<div class="empty-state">no posts found for this topic yet.</div>`}
  </section>
  <section class="browse-links" aria-labelledby="topic-browse-title">
    <div>
      <p class="eyebrow">more topics</p>
      <h2 id="topic-browse-title">continue through vidhgrow blogs</h2>
    </div>
    <nav aria-label="other blog topics">
      ${browse_links.filter(([, href]) => href !== `/topic/${topic.slug}`)
        .map(([label, href]) => `<a href="${href}">${escapehtml(label)}</a>`)
        .join("")}
    </nav>
  </section>
</main>
${footer(settingsres.data)}`;

  return pageshell({
    title: topicpagetitle(topic),
    description: topicpagedescription(topic),
    canonical: `${blog_public_url}/topic/${topic.slug}`,
    image: posts[0]?.coverimage?.url,
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "collectionpage",
      name: topic.title,
      description: topic.description,
      url: `${blog_public_url}/topic/${topic.slug}`,
    },
  });
};

const robotsstring = (seo = {}) => {
  const robots = seo.robots || {};
  return [
    robots.index === false ? "noindex" : "index",
    robots.follow === false ? "nofollow" : "follow",
    `max-image-preview:${robots.maximagepreview || "large"}`,
    `max-snippet:${number.isfinite(robots.maxsnippet) ? robots.maxsnippet : -1}`,
  ].join(",");
};

const rendercomments = (post, comments = []) => `<section class="comments" aria-labelledby="comments-title">
  <h2 id="comments-title">comments</h2>
  <p class="comments-note">comments use your existing vidhgrow account. one top-level comment per user, 100 characters max.</p>
  <div class="comment-auth" data-auth-panel>
    <span data-auth-state>checking vidhgrow login...</span>
    <a data-login-link href="https://vidhgrow.online/login">log in to comment</a>
  </div>
  <form class="comment-form" data-post-id="${escapehtml(post._id)}">
    <textarea name="content" maxlength="100" rows="3" placeholder="write a short comment" disabled></textarea>
    <div class="comment-actions"><span data-counter>0/100</span><button type="submit" disabled>post comment</button></div>
  </form>
  <div class="comment-list">
    ${comments
      .map((comment) => {
        const id = `c-${string(comment._id).slice(-6)}`;
        return `<article class="comment" id="${id}">
          <a class="comment-id" href="#${id}" data-preview="${escapehtml(comment.content)}">#${id}</a>
          <strong>${escapehtml(comment.user?.name || comment.user?.username || "reader")}</strong>
          <p>${escapehtml(comment.content)}</p>
          <form class="comment-form reply" data-post-id="${escapehtml(post._id)}" data-parent-comment="${escapehtml(comment._id)}">
            <textarea name="content" maxlength="100" rows="2" placeholder="reply to your comment" disabled></textarea>
            <div class="comment-actions"><span data-counter>0/100</span><button type="submit" disabled>reply</button></div>
          </form>
          ${
            comment.replies?.length
              ? `<div class="replies">${comment.replies
                  .map(
                    (reply) => `<article class="comment reply-item">
                      <strong>${escapehtml(reply.user?.name || reply.user?.username || "reader")}</strong>
                      <p>${escapehtml(reply.content)}</p>
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

const renderrelatedposts = (posts = []) => {
  if (!posts.length) return "";

  return `<section class="related-posts" aria-labelledby="related-title">
    <div class="section-heading compact">
      <p class="eyebrow">read next</p>
      <h2 id="related-title">related blogs</h2>
    </div>
    <div class="related-grid">
      ${posts
        .slice(0, 3)
        .map(
          (post) => `<article class="related-card">
            <a href="/${escapehtml(post.slug)}" class="related-image">
              <img src="${escapehtml(seoimage(post.coverimage?.url))}" alt="${escapehtml(imagealt(post.coverimage, `related cover for ${post.title}`))}" loading="lazy" />
            </a>
            <time datetime="${escapehtml(post.publishedat || post.createdat)}">${formatdate(post.publishedat || post.createdat)}</time>
            <h3><a href="/${escapehtml(post.slug)}">${escapehtml(post.title)}</a></h3>
            <p>${escapehtml(post.excerpt || "")}</p>
          </article>`,
        )
        .join("")}
    </div>
  </section>`;
};

const rendertopicpills = (topics = []) => {
  const cleantopics = [...set((topics || []).map(normalizetopicslug).filter(boolean))].filter(gettopic);
  if (!cleantopics.length) return "";

  return `<nav class="article-topics" aria-label="blog topics">
    ${cleantopics
      .map((topic) => `<a href="/topic/${escapehtml(topic)}">${escapehtml(topiclabel(topic))}</a>`)
      .join("")}
  </nav>`;
};

const renderarticlecontext = (post, contenthtml = "") => {
  const bodywordcount = wordcountfromhtml(contenthtml);
  const bodyparagraphcount = paragraphcountfromhtml(contenthtml);
  const title = post.title || "this vidhgrow update";
  const seotitle = post.seo?.metatitle && post.seo.metatitle !== title ? post.seo.metatitle : "";
  const visiblecontext = `${title} ${post.excerpt || ""} ${post.category || ""} ${(post.tags || []).join(" ")} ${contenthtml}`;
  const missingseoterms = missingimportantterms(post.seo?.metatitle || title, visiblecontext);
  if (bodywordcount >= 250 && bodyparagraphcount >= 3 && !missingseoterms.length) return "";

  const category = post.category || "platform";
  const tags = (post.tags || []).slice(0, 4).filter(boolean);
  const tagtext = tags.length ? tags.join(", ") : "online learning, course creation, and student practice";

  return `<section class="article-context" aria-labelledby="article-context-title">
    <p class="eyebrow">article context</p>
    <h2 id="article-context-title">more context on ${escapehtml(title)}</h2>
    <p>this vidhgrow blog covers ${escapehtml(title)} in the context of ${escapehtml(category)} work, teaching workflows, course updates, student practice, and platform improvements.</p>
    ${seotitle ? `<p>another way to read this piece is as a note on ${escapehtml(seotitle)}, with the details tied back to daily vidhgrow work and reader questions.</p>` : ""}
    <p>the note is connected to ${escapehtml(tagtext)} so readers can understand how the update fits into the wider vidhgrow product and learning experience.</p>
    <p>if you are comparing vidhgrow feature releases, teacher portal s, assessment updates, or course builder improvements, this article gives the practical background behind the .</p>
    <p>for readers coming from search, this context also makes the page easier to scan moving into related blogs, author notes, comments, or future vidhgrow platform updates.</p>
  </section>`;
};

const renderarticleambient = () => `<div class="article-ambient blog-ambient" aria-hidden="true">
  <span class="ambient-field ambient-field-one" data-parallax="0.015" data-parallax-x="-0.012"></span>
  <span class="ambient-field ambient-field-two" data-parallax="-0.018" data-parallax-x="0.01"></span>
  <span class="ambient-field ambient-field-three" data-parallax="0.022" data-parallax-x="-0.006"></span>
  <span class="ambient-rule ambient-rule-one" data-parallax="-0.035" data-parallax-x="0.018"></span>
  <span class="ambient-rule ambient-rule-two" data-parallax="0.04" data-parallax-x="-0.012"></span>
  <span class="ambient-rule ambient-rule-three" data-parallax="-0.028" data-parallax-x="0.014"></span>
  <span class="ambient-icon ambient-brain" data-parallax="0.05" data-parallax-x="-0.018">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m18 10c-4 0-7 3-7 7 0 1 .2 2 .6 3a8 8 0 0 0 8 27c0 5 4 9 9 9h2v10h-1zm12 0c4 0 7 3 7 7 0 1-.2 2-.6 3a8 8 0 0 1 40 27c0 5-4 9-9 9h-2v10h1zm19 18h-4m4 8h-5m15-8h4m-4 8h5"/></svg>
  </span>
  <span class="ambient-icon ambient-s" data-parallax="-0.04" data-parallax-x="0.012">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m10 14h24v22h10zm34 20h4v16c0 3-2 5-5 5h15m15 20h14m15 26h14m15 32h9"/></svg>
  </span>
  <span class="ambient-icon ambient-pen" data-parallax="0.03" data-parallax-x="-0.01">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m12 36l4-11 16-16 7 7-16 16-11 4zm18-25 7 7m16 25l7 7"/></svg>
  </span>
  <span class="ambient-icon ambient-comment" data-parallax="-0.06" data-parallax-x="0.02">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m12 14h24v18h20l-8 6v14zm7 7h16m19 27h10"/></svg>
  </span>
  <span class="ambient-icon ambient-chart" data-parallax="0.08" data-parallax-x="-0.014">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m10 38h28m15 34v22m9 12v14m9 20v26m12 12h24v26h12z"/></svg>
  </span>
  <span class="ambient-icon ambient-book" data-parallax="-0.03" data-parallax-x="0.009">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m12 12h11c3 0 5 2 5 5v21c0-3-2-5-5-5h12v12zm24 0h25c-3 0-5 2-5 5v21c0-3 2-5 5-5h11v12z"/></svg>
  </span>
  <span class="ambient-icon ambient-bell" data-parallax="0.04" data-parallax-x="-0.016">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m18 37h12m-8 4h4m10-8h12l4-5v-7c0-5 3-9 8-9s8 4 8 9v7l4 5z"/></svg>
  </span>
  <span class="ambient-icon ambient-globe" data-parallax="-0.05" data-parallax-x="0.015">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32zm-14-16h28m24 8c4 4 6 9 6 16s-2 12-6 16m24 8c-4 4-6 9-6 16s2 12 6 16"/></svg>
  </span>
  <span class="ambient-icon ambient-megaphone" data-parallax="0.072" data-parallax-x="-0.02">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m13 28h7l16 7v13l-16 7h-7v8zm7 0 3 9h-6l-2-9m21-12 4-3m-4 19 4 3m38 24h5"/></svg>
  </span>
  <span class="ambient-icon ambient-rss" data-parallax="-0.07" data-parallax-x="0.018">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m14 34h.1m14 24c6 0 10 4 10 10m14 14c12 0 20 8 20 20"/></svg>
  </span>
  <span class="ambient-icon ambient-search" data-parallax="0.052" data-parallax-x="-0.012">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m22 34a12 12 0 1 0 0-24 12 12 0 0 0 0 24zm9-3 9 9m17 22h10"/></svg>
  </span>
  <span class="ambient-icon ambient-calendar" data-parallax="-0.045" data-parallax-x="0.014">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m13 14h22v24h13zm13 20h22m18 10v8m12-8v8m18 27h4m6 0h4m-14 6h4m6 0h4"/></svg>
  </span>
  <span class="ambient-icon ambient-clipboard" data-parallax="0.065" data-parallax-x="-0.017">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m17 12h14l2 5h15l2-5zm-3 5h20v23h14v17zm6 9h10m-10 7h10"/></svg>
  </span>
  <span class="ambient-icon ambient-target" data-parallax="-0.058" data-parallax-x="0.02">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32zm0-6a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
  </span>
  <span class="ambient-icon ambient-lightbulb" data-parallax="0.038" data-parallax-x="-0.01">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m18 34h12m-10 5h8m-4-31a12 12 0 0 0-7 22c1 1 1 2 1 4h12c0-2 0-3 1-4a12 12 0 0 0 24 8zm0 0v5m-12 7h8m32 0h-4m14 12l-3-3m23 3 3-3"/></svg>
  </span>
  <span class="ambient-icon ambient-layers" data-parallax="-0.032" data-parallax-x="0.012">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m24 8 8 17l16 9 16-9-16-9zm-12 17 12 7 12-7m12 33l12 7 12-7"/></svg>
  </span>
  <span class="ambient-icon ambient-checklist" data-parallax="0.09" data-parallax-x="-0.022">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m15 12h22v28h15zm11 16h4m-4 8h4m-4 8h4m10-14 4 4 7-8m-11 16h11"/></svg>
  </span>
  <span class="ambient-icon ambient-sparkline" data-parallax="-0.082" data-parallax-x="0.018">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m10 36h28m13 31l7-8 6 5 10-14m0 0v8m0-8h-8"/></svg>
  </span>
  <span class="ambient-icon ambient-compass" data-parallax="0.047" data-parallax-x="-0.016">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m24 40a16 16 0 1 0 0-32 16 16 0 0 0 0 32zm6-22-4 10-10 4 4-10 10-4z"/></svg>
  </span>
  <span class="ambient-icon ambient-window" data-parallax="-0.062" data-parallax-x="0.016">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m10 12h28v24h10zm10 19h28m16 15h.1m21 15h.1m26 15h.1m16 26h16m16 31h10"/></svg>
  </span>
  <span class="ambient-icon ambient-cap" data-parallax="0.055" data-parallax-x="-0.014">
    <svg viewbox="0 0 48 48" focusable="false"><path d="m24 10 8 18l16 8 16-8-16-8zm-10 12v8c5 5 15 5 20 0v-8m40 18v12"/></svg>
  </span>
</div>`;

const renderarticleending = (post) => `<section class="article-ending" aria-label="end of article">
  <span class="ending-rule"></span>
  <div>
    <p class="eyebrow">end of blog</p>
    <h2>${escapehtml(post.title)} continues through related notes and reader comments.</h2>
    <p>keep going with connected vidhgrow stories below, or use the comments section to a short response from your account.</p>
    <div>
      <a href="#related-title">related blogs</a>
      <a href="#comments-title">comments</a>
    </div>
  </div>
</section>`;

const renderpost = async (slug) => {
  const [postres, settingsres] = await promise.all([
    fetchjson(`/api/blogs/public/${encodeuricomponent(slug)}`),
    fetchjson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { post, comments, relatedposts } = postres.data;
  const defaultcanonical = `${blog_public_url}/${post.slug}`;
  const canonical = absoluteurl(post.seo?.canonicalurl) || defaultcanonical;
  const title = metatitle(post.seo?.metatitle || post.title, post.title);
  const description = metadescription(post.seo?.metadescription || post.excerpt, post.excerpt || post.plaintextpreview);
  const social = settingsres.data?.socialmedia || {};
  const shareurl = canonical;
  const sharetitle = post.social?.sharetitle || post.title;
  const coverurl = seoimage(post.coverimage?.url);
  const coveralt = imagealt(post.coverimage, `${post.title} cover image`);
  const contenthtml = preparearticlecontenthtml(post.contenthtml, post.title);
  const readtime = readingtimelabel(post, contenthtml);
  const articlecontext = renderarticlecontext(post, contenthtml);

  const body = `${header()}
<main id="main" class="article-shell">
  ${renderarticleambient()}
  <article class="article">
    <nav class="article-breadcrumb" aria-label="breadcrumb">
      <a href="/">blogs</a>
      <span aria-hidden="true">&gt;</span>
      <span>${escapehtml(post.title)}</span>
    </nav>
    <p class="eyebrow">${escapehtml(post.category || "learning")}</p>
    <h1>${escapehtml(post.title)}</h1>
    ${rendertopicpills(post.topics)}
    <p class="article-excerpt">${escapehtml(post.excerpt)}</p>
    <div class="article-byline">
      ${renderauthoravatar(post.author)}
      <div>
        <a href="/author/${escapehtml(post.author?.slug || "")}">${escapehtml(post.author?.name || "vidhgrow editorial")}</a>
        <span>${formatdate(post.publishedat || post.createdat)} · ${escapehtml(readtime)}</span>
      </div>
    </div>
    <img class="article-cover" src="${escapehtml(coverurl)}" alt="${escapehtml(coveralt)}" />
    <div class="article-content">${contenthtml}</div>
    ${articlecontext}
    ${renderarticleending(post)}
    <div class="share-panel">
      <span>share</span>
      <button data-share-copy="${escapehtml(shareurl)}">copy link</button>
      <a href="https://twitter.com/intent/tweet?url=${encodeuricomponent(shareurl)}&text=${encodeuricomponent(sharetitle)}" target="_blank" rel="noopener noreferrer">twitter/x</a>
      <a href="https://www.linkedin.com/sharearticle?mini=true&url=${encodeuricomponent(shareurl)}&title=${encodeuricomponent(sharetitle)}" target="_blank" rel="noopener noreferrer">linkedin</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeuricomponent(shareurl)}" target="_blank" rel="noopener noreferrer">facebook</a>
    </div>
    ${
      object.values(social).some(boolean)
        ? `<div class="follow-panel"><span>follow vidhgrow</span>${object.entries(social)
            .filter(([, value]) => value)
            .map(([key, value]) => `<a href="${escapehtml(value)}" target="_blank" rel="noopener noreferrer">${escapehtml(key)}</a>`)
            .join("")}</div>`
        : ""
    }
  </article>
  ${renderrelatedposts(relatedposts || [])}
  ${rendercomments(post, comments || [])}
</main>
${footer(settingsres.data)}`;

  return pageshell({
    title,
    description,
    canonical,
    image: coverurl,
    ogtype: "article",
    robots: robotsstring(post.seo),
    body,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "blogposting",
      headline: post.title,
      description,
      image: coverurl,
      datepublished: post.publishedat,
      datemodified: post.updatedat,
      author: {
        "@type": "person",
        name: post.author?.name || "vidhgrow editorial",
        url: post.author?.slug ? `${blog_public_url}/author/${post.author.slug}` : blog_public_url,
      },
      publisher: {
        "@type": "organization",
        name: "vidhgrow",
        url: "https://vidhgrow.online",
      },
      mainentityofpage: canonical,
      wordcount: post.wordcount,
    },
  });
};

const renderauthoroverview = (author = {}, posts = []) => {
  const name = author.name || "vidhgrow editorial";
  const role = author.title || "vidhgrow blog author";
  const topicnames = [
    ...set(
      posts
        .flatmap((post) => post.topics || [])
        .map((topic) => topiclabel(topic))
        .filter(boolean),
    ),
  ].slice(0, 4);
  const topictext = topicnames.length
    ? topicnames.join(", ")
    : "product updates, teaching workflows, course s, student practice, and platform operations";
  const postcounttext = posts.length
    ? `${posts.length} published ${posts.length === 1 ? "blog" : "blogs"}`
    : "upcoming vidhgrow blogs";

  return `<section class="author-overview" aria-labelledby="author-overview-title">
    <p class="eyebrow">author profile</p>
    <h2 id="author-overview-title">editorial notes from ${escapehtml(name)}</h2>
    <p>${escapehtml(name)} is listed on vidhgrow blogs as ${escapehtml(role)}, with writing connected to ${escapehtml(topictext)}. this author page gives readers and search engines a clear place to understand the voice behind the posts, the subjects covered, and the way each article fits into the wider vidhgrow learning platform.</p>
    <p>the archive currently includes ${escapehtml(postcounttext)}. each article should explain real platform work in plain language: what d, why it matters, who it helps, and what teachers, students, admins, or course builders should notice next. that makes the page useful for readers who want product context instead of scattered updates.</p>
    <p>author pages are also part of the blog trust model. they connect post cards, related articles, topic archives, comments, and social sharing back to a stable profile. when vidhgrow publishes product s, teacher portal s, course builder notes, security updates, feedback improvements, or student progress stories, the author profile helps readers follow that work over time.</p>
    <p>use the article list below to move through recent writing from ${escapehtml(name)}, then continue into the linked topic pages for broader vidhgrow blog coverage. the page stays simple on purpose: a clear author identity, readable archive links, and enough context for search crawlers, ai assistants, and human readers to understand the publishing trail.</p>
  </section>`;
};

const renderauthor = async (slug) => {
  const [authorres, settingsres] = await promise.all([
    fetchjson(`/api/blogs/authors/${encodeuricomponent(slug)}`),
    fetchjson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { author, posts = [] } = authorres.data;
  const body = `${header()}
<main id="main" class="author-shell">
  <section class="author-card">
    ${renderauthoravatar(author, "author-fallback")}
    <div>
      <p class="eyebrow">author</p>
      <h1>${escapehtml(author.name)}</h1>
      ${author.title ? `<p class="author-title">${escapehtml(author.title)}</p>` : ""}
      ${author.bio ? `<p>${escapehtml(author.bio)}</p>` : ""}
    </div>
  </section>
  ${renderauthoroverview(author, posts || [])}
  <section class="post-list">${posts.map(postcard).join("")}</section>
</main>
  ${footer(settingsres.data)}`;
  return pageshell({
    title: metatitle(`${author.name} - vidhgrow blog author archive`, author.name),
    description: metadescription(
      author.bio,
      `read posts by ${author.name} on vidhgrow blogs, including product updates, teacher workflows, course notes, and online learning insights.`,
    ),
    canonical: `${blog_public_url}/author/${author.slug}`,
    image: author.avatar?.url,
    ogtype: "profile",
    body,
  });
};

const render404 = () =>
  pageshell({
    title: "page not found - vidhgrow blog",
    description: "this vidhgrow blog page could not be found.",
    canonical: `${blog_public_url}/404`,
    robots: "noindex,follow",
    body: `${header()}<main id="main" class="not-found"><p class="eyebrow">404</p><h1>that page is not here.</h1><p>the link may be old, or the post may have moved.</p><a href="/">back to the blog</a></main>${footer()}`,
  });

const renderfeed = async () => {
  const res = await fetchjson("/api/blogs/public?limit=30");
  const posts = res.data.posts || [];
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>vidhgrow blogs</title>
    <link>${blog_public_url}</link>
    <description>${escapehtml(home_seo_description)}</description>
    ${posts
      .map(
        (post) => `<item>
      <title>${escapehtml(post.title)}</title>
      <link>${blog_public_url}/${escapehtml(post.slug)}</link>
      <guid>${blog_public_url}/${escapehtml(post.slug)}</guid>
      <pubdate>${date(post.publishedat || post.createdat).toutcstring()}</pubdate>
      <description>${escapehtml(post.excerpt)}</description>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;
};

const renderllmstxt = () => `# vidhgrow blogs

official blog for vidhgrow product updates, teaching workflows, course s, assessment notes, student progress, security updates, admin workflows, and feedback notes.

primary site: ${blog_public_url}
sitemap: ${blog_public_url}/sitemap.xml
rss feed: ${blog_public_url}/feed.xml
robots: ${blog_public_url}/robots.txt

important public sections:
${topic_links.map((topic) => `- ${topic.title}: ${blog_public_url}/topic/${topic.slug}`).join("\n")}

use the canonical urls on each page. public blog pages are server-rendered html with article content, topic links, author links, structured data, open graph metadata, and readable comments. admin-only blog apis, unpublished drafts, upload urls, encrypted records, and private vidhgrow application apis are not intended for model ingestion.
`;

const assetcache = map();

const minifycss = (content) =>
  string(content)
    .replace(/\/\*[\s\s]*?\*\//g, "")
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
    console.error("Render error:", error);
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
