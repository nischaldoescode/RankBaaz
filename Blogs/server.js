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
const BLOG_PUBLIC_URL = process.env.BLOGS_PUBLIC_URL || "https://blogs.vidhgrow.online";

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
  robots = "index,follow,max-image-preview:large",
  body,
  jsonLd,
}) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${escapeHtml(robots)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Vidhgrow Blog" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ""}
  <link rel="alternate" type="application/rss+xml" title="Vidhgrow Blog" href="${BLOG_PUBLIC_URL}/feed.xml" />
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

const header = () => `<header class="site-header">
  <a class="wordmark" href="/">Vidhgrow Blog</a>
  <nav aria-label="Primary">
    <a href="/">Stories</a>
    <a href="/sitemap.xml">Sitemap</a>
    <a href="https://vidhgrow.online">Vidhgrow</a>
  </nav>
</header>`;

const footer = (settings = {}) => {
  const social = settings.socialMedia || {};
  const links = Object.entries(social).filter(([, url]) => url);
  return `<footer class="site-footer">
    <div>
      <strong>Vidhgrow Blog</strong>
      <p>Readable notes on learning, exams, practice, and building better study habits.</p>
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
    <img src="${escapeHtml(post.coverImage?.url || "")}" alt="${escapeHtml(post.coverImage?.alt || post.title)}" loading="lazy" />
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
  const query = url.searchParams.get("q")?.trim().toLowerCase() || "";
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
        .includes(query),
    );
  }

  const latest = posts[0];
  const body = `${header()}
<main id="main" class="home-shell">
  <section class="home-intro">
    <div>
      <p class="eyebrow">Learning notes</p>
      <h1>Useful writing for people who are practicing seriously.</h1>
      <p class="lede">Simple essays, course notes, exam strategy, and calm explanations from the Vidhgrow team.</p>
    </div>
    <form class="search-form" method="get" action="/">
      <label for="q">Search posts</label>
      <div>
        <input id="q" name="q" value="${escapeHtml(query)}" placeholder="Search learning, exams, focus..." />
        <button type="submit">Search</button>
      </div>
    </form>
  </section>
  ${
    latest && !query
      ? `<section class="featured-post">
          <a href="/${escapeHtml(latest.slug)}"><img src="${escapeHtml(latest.coverImage?.url || "")}" alt="${escapeHtml(latest.coverImage?.alt || latest.title)}" /></a>
          <div>
            <time datetime="${escapeHtml(latest.publishedAt || latest.createdAt)}">${formatDate(latest.publishedAt || latest.createdAt)}</time>
            <h2><a href="/${escapeHtml(latest.slug)}">${escapeHtml(latest.title)}</a></h2>
            <p>${escapeHtml(latest.excerpt)}</p>
          </div>
        </section>`
      : ""
  }
  <section class="post-list" aria-label="Blog posts">
    ${posts.map(postCard).join("") || `<div class="empty-state">No posts found.</div>`}
  </section>
</main>
${footer(settingsRes.data)}`;

  return pageShell({
    title: "Vidhgrow Blog",
    description: "Readable Vidhgrow notes on learning, exam practice, study planning, and better test preparation.",
    canonical: BLOG_PUBLIC_URL,
    image: latest?.coverImage?.url,
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Vidhgrow Blog",
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

const renderPost = async (slug) => {
  const [postRes, settingsRes] = await Promise.all([
    fetchJson(`/api/blogs/public/${encodeURIComponent(slug)}`),
    fetchJson("/api/blogs/settings/share").catch(() => ({ data: {} })),
  ]);
  const { post, comments } = postRes.data;
  const canonical = post.seo?.canonicalUrl || `${BLOG_PUBLIC_URL}/${post.slug}`;
  const social = settingsRes.data?.socialMedia || {};
  const shareUrl = `${BLOG_PUBLIC_URL}/${post.slug}`;
  const shareTitle = post.social?.shareTitle || post.title;

  const body = `${header()}
<main id="main" class="article-shell">
  <article class="article">
    <p class="eyebrow">${escapeHtml(post.category || "learning")}</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="article-excerpt">${escapeHtml(post.excerpt)}</p>
    <div class="article-byline">
      ${
        post.author?.avatar?.url
          ? `<img src="${escapeHtml(post.author.avatar.url)}" alt="${escapeHtml(post.author.avatar.alt || post.author.name)}" />`
          : `<span class="avatar-fallback"></span>`
      }
      <div>
        <a href="/author/${escapeHtml(post.author?.slug || "")}">${escapeHtml(post.author?.name || "Vidhgrow Editorial")}</a>
        <span>${formatDate(post.publishedAt || post.createdAt)} · ${post.readingTimeMinutes || 1} min read</span>
      </div>
    </div>
    <img class="article-cover" src="${escapeHtml(post.coverImage?.url || "")}" alt="${escapeHtml(post.coverImage?.alt || post.title)}" />
    <div class="article-content">${post.contentHtml}</div>
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
  ${renderComments(post, comments || [])}
</main>
${footer(settingsRes.data)}`;

  return pageShell({
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt,
    canonical,
    image: post.coverImage?.url,
    robots: robotsString(post.seo),
    body,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      image: post.coverImage?.url,
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
    ${
      author.avatar?.url
        ? `<img src="${escapeHtml(author.avatar.url)}" alt="${escapeHtml(author.avatar.alt || author.name)}" />`
        : ""
    }
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
    title: `${author.name} - Vidhgrow Blog`,
    description: author.bio || `Posts by ${author.name} on Vidhgrow Blog.`,
    canonical: `${BLOG_PUBLIC_URL}/author/${author.slug}`,
    image: author.avatar?.url,
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
    <title>Vidhgrow Blog</title>
    <link>${BLOG_PUBLIC_URL}</link>
    <description>Vidhgrow learning notes and study essays.</description>
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

const serveStatic = async (res, filePath, contentType) => {
  const content = await fs.readFile(path.join(__dirname, filePath));
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
  });
  res.end(content);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, BLOG_ORIGIN);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/assets/styles.css") {
      return serveStatic(res, "public/styles.css", "text/css; charset=utf-8");
    }
    if (pathname === "/assets/app.js") {
      return serveStatic(res, "public/app.js", "application/javascript; charset=utf-8");
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
