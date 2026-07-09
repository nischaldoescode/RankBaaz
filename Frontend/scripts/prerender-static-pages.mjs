/**
 * writes route-specific html for public static pages after the vite build
 *
 * @returns {Promise<void>} creates crawlable public page documents inside dist
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve(process.env.VITE_OUT_DIR || "dist");
const sourcePath = path.join(distDirectory, "index.html");
const siteUrl = (process.env.VITE_SITE_URL || "https://vidhgrow.online").replace(/\/$/, "");

const pages = [
  {
    slug: "about",
    title: "About Vidhgrow | Courses, Practice Tests and Progress",
    description:
      "Learn about Vidhgrow, the official learning platform for teacher-led courses, protected practice tests, score feedback, and student progress reports.",
    type: "AboutPage",
    h1: "About Vidhgrow",
    intro:
      "Vidhgrow brings course material, timed practice, teacher context, and progress reports into one focused learning workspace.",
    sections: [
      ["What Vidhgrow does", "Students can browse courses, attempt protected tests, review feedback, and use public profiles to track visible learning progress."],
      ["Who it serves", "Vidhgrow supports learners, verified teachers, and course creators who want structured online learning without noisy decoration."],
    ],
    links: [
      ["Browse courses", "/courses"],
      ["Become a teacher", "/teacher"],
      ["Read the blog", "https://blogs.vidhgrow.online/"],
    ],
  },
  {
    slug: "courses",
    title: "Vidhgrow Courses | Teacher-Led Learning and Practice Tests",
    description:
      "Browse Vidhgrow courses with teacher context, lesson material, protected practice tests, score feedback, and progress tracking for learners.",
    type: "CollectionPage",
    h1: "Vidhgrow courses",
    intro:
      "Course pages help learners find teacher-led material, practice tests, and study paths before starting protected test attempts.",
    sections: [
      ["Course discovery", "Learners can compare course context, available tests, teacher attribution, and what the course helps them practice."],
      ["Protected attempts", "Actual test attempts stay inside authenticated routes so questions, answers, scoring, and progress are not exposed publicly."],
    ],
    links: [
      ["Practice tests", "/tests"],
      ["Create an account", "/register"],
      ["Teacher application", "/teacher"],
    ],
  },
  {
    slug: "contact",
    title: "Contact Vidhgrow Support | Courses, Accounts and Teacher Help",
    description:
      "Contact Vidhgrow support for student accounts, course access, practice tests, teacher applications, verification, privacy, and platform help.",
    type: "ContactPage",
    h1: "Contact Vidhgrow",
    intro:
      "Use the official contact page for help with accounts, courses, teacher applications, privacy questions, and platform support.",
    sections: [
      ["Support email", "The official support address is support@vidhgrow.online."],
      ["What to include", "Share the account email, page URL, and a clear description of the issue so the support team can review it safely."],
    ],
    links: [
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
      ["Teacher application", "/teacher"],
    ],
  },
  {
    slug: "login",
    title: "Vidhgrow Login | Student Course and Test Account",
    description:
      "Sign in to your Vidhgrow account to access enrolled courses, protected tests, score reports, public profiles, and student progress tools.",
    type: "WebPage",
    h1: "Log in to Vidhgrow",
    intro:
      "The Vidhgrow login page is used by students to continue courses, protected test attempts, score review, and profile progress.",
    sections: [
      ["Account access", "Use the same Vidhgrow account for courses, tests, feedback, and public learner profile activity."],
      ["Safe redirects", "Login redirects only return to Vidhgrow-owned public surfaces and protected learning routes."],
    ],
    links: [
      ["Create an account", "/register"],
      ["Browse courses", "/courses"],
      ["Contact support", "/contact"],
    ],
  },
  {
    slug: "register",
    title: "Create a Free Vidhgrow Account | Courses and Practice Tests",
    description:
      "Create a free Vidhgrow student account to join courses, take protected practice tests, review feedback, and track learning progress.",
    type: "WebPage",
    h1: "Create a Vidhgrow account",
    intro:
      "Registration lets learners save course progress, take protected practice tests, and build a public learning profile on Vidhgrow.",
    sections: [
      ["Student account", "A student account keeps attempts, reports, and progress connected to one verified learner."],
      ["After registration", "Learners can browse courses, start eligible tests, and return to progress reports after each attempt."],
    ],
    links: [
      ["Log in", "/login"],
      ["Browse courses", "/courses"],
      ["Privacy policy", "/privacy"],
    ],
  },
  {
    slug: "privacy",
    title: "Vidhgrow Privacy Policy | Student, Teacher and Course Data",
    description:
      "Read how Vidhgrow handles student accounts, teacher profiles, course activity, test progress, documents, payments, security, and privacy choices.",
    type: "WebPage",
    h1: "Vidhgrow privacy policy",
    intro:
      "The privacy policy explains how Vidhgrow handles account data, course activity, teacher information, test progress, security, and privacy choices.",
    sections: [
      ["Public and private data", "Public profile and teacher pages are separate from private documents, test attempts, payments, and admin workflows."],
      ["Security context", "Authenticated routes, backend APIs, documents, and protected test attempts are not intended as public crawlable content."],
    ],
    links: [
      ["Terms of service", "/terms"],
      ["Contact support", "/contact"],
      ["Create an account", "/register"],
    ],
  },
  {
    slug: "terms",
    title: "Vidhgrow Terms of Service | Courses, Tests and Teacher Accounts",
    description:
      "Read the Vidhgrow terms for student accounts, teacher accounts, course access, practice tests, payments, platform use, and support rules.",
    type: "WebPage",
    h1: "Vidhgrow terms of service",
    intro:
      "The terms of service describe how students, teachers, and visitors can use Vidhgrow courses, tests, accounts, and public pages.",
    sections: [
      ["Learning platform terms", "The public website explains Vidhgrow features while protected workflows remain available only after account checks."],
      ["Teacher and student use", "Teacher publishing, student attempts, account access, and support requests are handled through official Vidhgrow routes."],
    ],
    links: [
      ["Privacy policy", "/privacy"],
      ["Teacher application", "/teacher"],
      ["Contact support", "/contact"],
    ],
  },
];

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const escapeAttribute = escapeHtml;

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const routeUrl = (slug) => `${siteUrl}/${slug}`;

const pageSchema = (page) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": page.type,
      "@id": `${routeUrl(page.slug)}#webpage`,
      name: page.title,
      description: page.description,
      url: routeUrl(page.slug),
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Vidhgrow", item: `${siteUrl}/` },
        { "@type": "ListItem", position: 2, name: page.h1, item: routeUrl(page.slug) },
      ],
    },
  ],
});

const fallbackStyles = `<style id="static-page-fallback-style">
  .static-page-fallback{max-width:820px;margin:0 auto;padding:96px 24px 56px;color:#13233d;background:#fff;font:400 17px/1.68 Inter,system-ui,sans-serif}
  .static-page-fallback nav{font-size:14px;margin-bottom:28px;color:#52647e}.static-page-fallback a{color:#2563eb;text-underline-offset:3px}
  .static-page-fallback h1{max-width:720px;margin:0 0 18px;font-size:clamp(34px,6vw,58px);line-height:1.08;letter-spacing:0;color:#10213c}
  .static-page-fallback h2{margin:34px 0 10px;font-size:24px;line-height:1.25;color:#10213c}.static-page-fallback p{max-width:720px}
  .static-page-fallback ul{display:flex;flex-wrap:wrap;gap:12px;padding:0;list-style:none;margin-top:30px}.static-page-fallback li a{display:inline-flex;border:1px solid #dce7f7;border-radius:999px;padding:10px 14px;text-decoration:none}
</style>`;

const pageMarkup = (page) => `<main id="${escapeAttribute(page.slug)}-page-content" class="static-page-fallback">
  <nav aria-label="breadcrumb"><a href="/">Vidhgrow</a><span aria-hidden="true"> / </span><span>${escapeHtml(page.h1)}</span></nav>
  <article>
    <h1>${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.intro)}</p>
    ${page.sections
      .map(
        ([heading, body]) => `<section>
      <h2>${escapeHtml(heading)}</h2>
      <p>${escapeHtml(body)}</p>
    </section>`,
      )
      .join("")}
    <ul aria-label="related Vidhgrow pages">
      ${page.links.map(([label, href]) => `<li><a href="${escapeAttribute(href)}">${escapeHtml(label)}</a></li>`).join("")}
    </ul>
  </article>
</main>`;

const renderPageDocument = (sourceDocument, page) => {
  const canonical = routeUrl(page.slug);
  let document = sourceDocument
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, "")
    .replace(/<noscript>[\s\S]*?<\/noscript>/i, "")
    .replace(/<div id="root"><\/div>/i, `<div id="root">${pageMarkup(page)}</div>`)
    .replace(
      "</head>",
      `  <link rel="canonical" href="${escapeAttribute(canonical)}" />\n  ${fallbackStyles}\n  <script type="application/ld+json">${JSON.stringify(pageSchema(page))}</script>\n</head>`,
    );

  document = replaceMeta(document, "name", "title", page.title);
  document = replaceMeta(document, "name", "description", page.description);
  document = replaceMeta(document, "property", "og:title", page.title);
  document = replaceMeta(document, "property", "og:description", page.description);
  document = replaceMeta(document, "property", "og:url", canonical);
  document = replaceMeta(document, "name", "twitter:title", page.title);
  document = replaceMeta(document, "name", "twitter:description", page.description);
  document = replaceMeta(document, "name", "twitter:url", canonical);

  return document;
};

const sourceDocument = await readFile(sourcePath, "utf8");

await Promise.all(
  pages.map(async (page) => {
    const document = renderPageDocument(sourceDocument, page);
    const pageDirectory = path.join(distDirectory, page.slug);
    await mkdir(pageDirectory, { recursive: true });
    await writeFile(path.join(pageDirectory, "index.html"), document, "utf8");
    await writeFile(path.join(distDirectory, `${page.slug}.html`), document, "utf8");
  }),
);

console.log(`Static seo pages written to dist: ${pages.length}`);
