/**
 * writes a crawlable teacher application document after vite finishes the static build
 *
 * @returns {Promise<void>} creates the canonical teacher route document inside dist
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve(process.env.VITE_OUT_DIR || "dist");
const sourcePath = path.join(distDirectory, "index.html");
const targetDirectory = path.join(distDirectory, "teacher");
const targetPath = path.join(targetDirectory, "index.html");
const canonicalUrl = "https://vidhgrow.online/teacher";
const title = "Become a Teacher on Vidhgrow | Official Application Guide";
const description =
  "Official Vidhgrow guide for qualified educators: check eligibility, apply, complete verification, and create courses, lessons, quizzes, and tests.";

const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const replaceMeta = (document, attribute, key, content) => {
  const expression = new RegExp(
    `<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*\\/?\\s*>`,
    "i",
  );
  const tag = `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(content)}" />`;
  return expression.test(document) ? document.replace(expression, tag) : document.replace("</head>", `  ${tag}\n</head>`);
};

const teacherSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://vidhgrow.online/#organization",
      name: "Vidhgrow",
      url: "https://vidhgrow.online",
      logo: "https://vidhgrow.online/logo.png",
      sameAs: ["https://www.instagram.com/vidhgrow.online"],
    },
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      name: "Become a Teacher on Vidhgrow",
      url: canonicalUrl,
      description,
      isPartOf: { "@id": "https://vidhgrow.online/#website" },
      about: { "@id": "https://vidhgrow.online/#organization" },
      potentialAction: {
        "@type": "ApplyAction",
        target: `${canonicalUrl}#apply`,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Vidhgrow", item: "https://vidhgrow.online/" },
        { "@type": "ListItem", position: 2, name: "Become a Teacher", item: canonicalUrl },
      ],
    },
  ],
};

const fallbackMarkup = `<main id="teacher-page-content" class="teacher-page-fallback">
  <nav aria-label="breadcrumb"><a href="/">Vidhgrow</a><span aria-hidden="true"> / </span><span>Become a teacher</span></nav>
  <article>
    <p class="teacher-page-kicker">Vidhgrow teacher application</p>
    <h1>How to become a teacher on Vidhgrow</h1>
    <p>Qualified educators, tutors, subject specialists, and professionals with relevant teaching experience can apply to teach on Vidhgrow. Applications are reviewed before teacher tools are enabled.</p>
    <h2>Who can apply</h2>
    <p>Applicants should be able to show relevant qualifications, professional certifications, subject expertise, or teaching experience. Vidhgrow reviews this information to help keep course content useful and trustworthy for learners.</p>
    <h2>Application and verification</h2>
    <ol>
      <li>Submit your teacher application with your contact details and teaching background.</li>
      <li>Complete the verification process when Vidhgrow requests supporting information.</li>
      <li>Wait for the application decision sent to your email address.</li>
      <li>After approval, use the teacher portal to create and manage courses, lessons, quizzes, and tests.</li>
    </ol>
    <h2>Start your application</h2>
    <p><a href="/teacher#apply">Apply to teach on Vidhgrow</a> or <a href="https://teachers.vidhgrow.online">sign in to the teacher portal</a> if you already have an approved teacher account.</p>
    <p>For more context, read the <a href="https://blogs.vidhgrow.online/become-a-teacher-on-vidhgrow">official Vidhgrow teacher application guide</a>.</p>
  </article>
</main>`;

const fallbackStyles = `<style id="teacher-page-fallback-style">
  .teacher-page-fallback{max-width:760px;margin:0 auto;padding:96px 24px 56px;color:#13233d;background:#fff;font:400 17px/1.65 Inter,system-ui,sans-serif}
  .teacher-page-fallback nav{font-size:14px;margin-bottom:28px;color:#52647e}.teacher-page-fallback a{color:#2563eb;text-underline-offset:3px}
  .teacher-page-fallback h1{max-width:660px;margin:0 0 18px;font-size:clamp(34px,6vw,58px);line-height:1.08;letter-spacing:0;color:#10213c}
  .teacher-page-fallback h2{margin:36px 0 10px;font-size:24px;line-height:1.25;color:#10213c}.teacher-page-fallback p,.teacher-page-fallback li{max-width:680px}
  .teacher-page-fallback ol{padding-left:24px}.teacher-page-kicker{margin-bottom:10px;color:#2563eb;font-weight:700;font-size:14px;letter-spacing:.04em;text-transform:uppercase}
</style>`;

let document = await readFile(sourcePath, "utf8");
document = document
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(title)}</title>`)
  .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, "")
  .replace(/<h1 class="seo-h1">[\s\S]*?<\/h1>/i, "")
  .replace(/<noscript>[\s\S]*?<\/noscript>/i, "")
  .replace(/<div id="root"><\/div>/i, `<div id="root">${fallbackMarkup}</div>`)
  .replace("</head>", `  <link rel="canonical" href="${canonicalUrl}" />\n  ${fallbackStyles}\n  <script type="application/ld+json">${JSON.stringify(teacherSchema)}</script>\n</head>`);
document = replaceMeta(document, "name", "title", title);
document = replaceMeta(document, "name", "description", description);
document = replaceMeta(document, "property", "og:title", title);
document = replaceMeta(document, "property", "og:description", description);
document = replaceMeta(document, "property", "og:url", canonicalUrl);
document = replaceMeta(document, "name", "twitter:title", title);
document = replaceMeta(document, "name", "twitter:description", description);
document = replaceMeta(document, "name", "twitter:url", canonicalUrl);

await mkdir(targetDirectory, { recursive: true });
await writeFile(targetPath, document, "utf8");
