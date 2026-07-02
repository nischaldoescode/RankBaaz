/**
 * writes crawlable test overview documents after vite finishes the static build
 *
 * @returns {Promise<void>} creates /tests pages and a test sitemap inside dist
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve(process.env.VITE_OUT_DIR || "dist");
const sourcePath = path.join(distDirectory, "index.html");
const testsDirectory = path.join(distDirectory, "tests");
const siteUrl = (process.env.VITE_SITE_URL || "https://vidhgrow.online").replace(/\/$/, "");
const apiBase = (
  process.env.VITE_API_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "https://api.vidhgrow.online"
).replace(/\/$/, "");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const escapeAttribute = escapeHtml;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const replaceMeta = (document, attribute, key, content) => {
  const expression = new RegExp(
    `<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*\\/?\\s*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}" />`;
  return expression.test(document)
    ? document.replace(expression, tag)
    : document.replace("</head>", `  ${tag}\n</head>`);
};

const compactDescription = (value = "", fallback = "") => {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  if (text.length <= 158) return text;
  return `${text.slice(0, 155).replace(/\s+\S*$/, "")}...`;
};

const difficultyNames = (test) =>
  (test.difficulties || []).map((difficulty) => difficulty.name).join(", ") || "all levels";

const fetchTests = async () => {
  const response = await fetch(`${apiBase}/api/courses/test-seo?limit=5000`, {
    headers: {
      accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      origin: siteUrl,
      referer: `${siteUrl}/`,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`test seo api returned ${response.status}`);
  }

  const body = await response.json();
  return body?.data?.tests || [];
};

const baseSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${siteUrl}/#organization`,
  name: "Vidhgrow",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
};

const pageShell = (sourceDocument, { title, description, canonical, image, schema, markup }) => {
  let document = sourceDocument
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(title)}</title>`)
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, "")
    .replace(/<noscript>[\s\S]*?<\/noscript>/i, "")
    .replace(/<div id="root"><\/div>/i, `<div id="root">${markup}</div>`)
    .replace(
      "</head>",
      `  <link rel="canonical" href="${escapeAttribute(canonical)}" />\n  <script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`,
    );

  document = replaceMeta(document, "name", "title", title);
  document = replaceMeta(document, "name", "description", description);
  document = replaceMeta(document, "property", "og:title", title);
  document = replaceMeta(document, "property", "og:description", description);
  document = replaceMeta(document, "property", "og:url", canonical);
  document = replaceMeta(document, "property", "og:image", image || `${siteUrl}/og-image.png`);
  document = replaceMeta(document, "name", "twitter:title", title);
  document = replaceMeta(document, "name", "twitter:description", description);
  document = replaceMeta(document, "name", "twitter:url", canonical);
  document = replaceMeta(document, "name", "twitter:image", image || `${siteUrl}/og-image.png`);

  return document;
};

const renderTestMarkup = (test) => {
  const title = `${test.name} practice test`;
  const difficultyMarkup = (test.difficulties || [])
    .map(
      (difficulty) => `<li>
        <strong>${escapeHtml(difficulty.name)}</strong>
        <span>${escapeHtml(difficulty.readableTime || "timed attempt")}</span>
        <p>Up to ${escapeHtml(difficulty.maxQuestions || "selected")} questions with ${escapeHtml(difficulty.marksPerQuestion || "configured")} marks per question</p>
      </li>`,
    )
    .join("");

  return `<main class="test-seo-fallback" style="max-width:960px;margin:0 auto;padding:96px 24px 56px;color:#13233d;background:#fff;font:400 17px/1.7 Inter,system-ui,sans-serif">
    <nav aria-label="breadcrumb" style="font-size:14px;margin-bottom:28px;color:#52647e">
      <a href="/" style="color:#2563eb;text-underline-offset:3px">Vidhgrow</a>
      <span aria-hidden="true"> / </span>
      <a href="/tests" style="color:#2563eb;text-underline-offset:3px">Practice tests</a>
      <span aria-hidden="true"> / </span>
      <span>${escapeHtml(test.name)}</span>
    </nav>
    <article>
      <p style="margin-bottom:10px;color:#2563eb;font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(test.category?.name || "practice test")}</p>
      <h1 style="max-width:760px;margin:0 0 18px;font-size:clamp(34px,6vw,60px);line-height:1.08;letter-spacing:0;color:#10213c">${escapeHtml(title)}</h1>
      <p style="max-width:760px;font-size:19px;color:#43546c">${escapeHtml(test.description)}</p>
      ${test.image?.url ? `<img src="${escapeAttribute(test.image.url)}" alt="${escapeAttribute(`${test.name} practice test cover`)}" style="width:100%;max-height:420px;object-fit:cover;border-radius:28px;margin:32px 0" />` : ""}
      <section aria-label="test summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin:34px 0">
        <div style="border:1px solid #dce7f7;border-radius:20px;padding:18px"><strong>${escapeHtml(test.totalQuestions || 0)}</strong><p>active questions</p></div>
        <div style="border:1px solid #dce7f7;border-radius:20px;padding:18px"><strong>${escapeHtml(test.readableDuration || "timed")}</strong><p>estimated time</p></div>
        <div style="border:1px solid #dce7f7;border-radius:20px;padding:18px"><strong>${escapeHtml(difficultyNames(test))}</strong><p>difficulty levels</p></div>
      </section>
      <h2 style="font-size:28px;margin-top:32px;color:#10213c">What this test helps you check</h2>
      <p>This public page explains the test before a learner starts it. The actual attempt remains protected inside Vidhgrow, so the question pool, answer key, explanations, scoring state, and completion result are only handled after login and course access checks.</p>
      <p>The page is useful for discovery because it gives learners and search engines the same stable context: the course name, category, available difficulty levels, question count, expected timing, and teacher attribution when a verified teacher created the course.</p>
      <p>When a learner starts the test, Vidhgrow checks their session, selected difficulty, active question availability, course purchase state where required, and previous completion state. That keeps the overview indexable without weakening the real assessment flow.</p>
      <h2 style="font-size:28px;margin-top:32px;color:#10213c">Difficulty breakdown</h2>
      <ul style="display:grid;gap:12px;padding:0;list-style:none">${difficultyMarkup}</ul>
      <p style="margin-top:32px"><a href="/app/test/${escapeAttribute(test._id)}" style="color:#2563eb;font-weight:700;text-underline-offset:3px">Start this test on Vidhgrow</a></p>
      <p><a href="/courses" style="color:#2563eb;text-underline-offset:3px">Browse all Vidhgrow courses</a></p>
    </article>
  </main>`;
};

const renderIndexMarkup = (tests) => `<main class="test-seo-index-fallback" style="max-width:1040px;margin:0 auto;padding:96px 24px 56px;color:#13233d;background:#fff;font:400 17px/1.7 Inter,system-ui,sans-serif">
  <nav aria-label="breadcrumb" style="font-size:14px;margin-bottom:28px;color:#52647e"><a href="/" style="color:#2563eb;text-underline-offset:3px">Vidhgrow</a><span aria-hidden="true"> / </span><span>Practice tests</span></nav>
  <h1 style="max-width:760px;margin:0 0 18px;font-size:clamp(34px,6vw,60px);line-height:1.08;letter-spacing:0;color:#10213c">Vidhgrow practice tests for course based learning</h1>
  <p style="max-width:760px;font-size:19px;color:#43546c">Browse public test overview pages by course name, topic, difficulty level, timing, and active question count before moving into the protected attempt flow.</p>
  <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:34px">
    ${tests
      .map(
        (test) => `<article style="border:1px solid #dce7f7;border-radius:22px;padding:20px">
          <p style="font-size:13px;color:#52647e;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(test.category?.name || "practice test")}</p>
          <h2 style="font-size:24px;line-height:1.2;margin:8px 0"><a href="/tests/${escapeAttribute(test.slug)}" style="color:#10213c;text-decoration:none">${escapeHtml(test.name)}</a></h2>
          <p>${escapeHtml(compactDescription(test.description, `${test.name} practice test on Vidhgrow`))}</p>
        </article>`,
      )
      .join("")}
  </section>
</main>`;

const writeTestPage = async (sourceDocument, test) => {
  const canonical = `${siteUrl}/tests/${test.slug}`;
  const title = `${test.name} Practice Test | Vidhgrow`;
  const description = compactDescription(
    test.description,
    `${test.name} practice test on Vidhgrow with timed questions, difficulty levels, score feedback, and progress tracking.`,
  );
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      baseSchema,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Vidhgrow", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Practice tests", item: `${siteUrl}/tests` },
          { "@type": "ListItem", position: 3, name: `${test.name} practice test`, item: canonical },
        ],
      },
      {
        "@type": "Quiz",
        "@id": `${canonical}#quiz`,
        name: `${test.name} practice test`,
        url: canonical,
        description,
        image: test.image?.url,
        educationalUse: "practice",
        learningResourceType: "assessment",
        assesses: test.category?.name || test.name,
        provider: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  const document = pageShell(sourceDocument, {
    title,
    description,
    canonical,
    image: test.image?.url,
    schema,
    markup: renderTestMarkup(test),
  });

  const pageDirectory = path.join(testsDirectory, test.slug);
  await mkdir(pageDirectory, { recursive: true });
  await writeFile(path.join(pageDirectory, "index.html"), document, "utf8");
};

const writeIndexPage = async (sourceDocument, tests) => {
  const canonical = `${siteUrl}/tests`;
  const title = "Vidhgrow Practice Tests | Course Based Exam Practice";
  const description =
    "Browse Vidhgrow practice tests by course, topic, difficulty, timing, question count, and teacher context before starting a protected attempt.";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      baseSchema,
      {
        "@type": "CollectionPage",
        name: "Vidhgrow practice tests",
        url: canonical,
        description,
      },
    ],
  };

  const document = pageShell(sourceDocument, {
    title,
    description,
    canonical,
    image: `${siteUrl}/og-image.png`,
    schema,
    markup: renderIndexMarkup(tests),
  });

  await mkdir(testsDirectory, { recursive: true });
  await writeFile(path.join(testsDirectory, "index.html"), document, "utf8");
};

const writeSitemap = async (tests) => {
  const urls = [
    {
      loc: `${siteUrl}/tests`,
      lastmod: new Date().toISOString().split("T")[0],
      priority: "0.8",
    },
    ...tests.map((test) => ({
      loc: `${siteUrl}/tests/${test.slug}`,
      lastmod: new Date(test.updatedAt || test.createdAt || Date.now()).toISOString().split("T")[0],
      priority: "0.7",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  await writeFile(path.join(distDirectory, "sitemap-tests.xml"), xml, "utf8");
};

try {
  const sourceDocument = await readFile(sourcePath, "utf8");
  const tests = await fetchTests();

  await writeIndexPage(sourceDocument, tests);
  await Promise.all(tests.map((test) => writeTestPage(sourceDocument, test)));
  await writeSitemap(tests);

  console.log(`Prerendered ${tests.length} public test seo pages`);
} catch (error) {
  console.warn(`Test seo prerender skipped: ${error.message}`);
  try {
    const sourceDocument = await readFile(sourcePath, "utf8");
    await mkdir(testsDirectory, { recursive: true });
    await writeIndexPage(sourceDocument, []);
    await writeSitemap([]);
  } catch (writeError) {
    console.warn(`Could not write fallback test sitemap: ${writeError.message}`);
  }
}
