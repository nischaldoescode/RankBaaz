/**
 * writes the public profile sitemap into the frontend build output
 *
 * @returns {Promise<void>} keeps /sitemap-profiles.xml as xml instead of the spa fallback
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve(process.env.VITE_OUT_DIR || "dist");
const targetPath = path.join(distDirectory, "sitemap-profiles.xml");
const sourcePath = path.join(distDirectory, "index.html");
const siteUrl = (process.env.VITE_SITE_URL || "https://vidhgrow.online").replace(/\/$/, "");
const apiBase = (
  process.env.VITE_API_URL ||
  process.env.PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "https://api.vidhgrow.online"
).replace(/\/$/, "");

const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`;

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

const hasValidProfileSitemapShape = (xml = "") => {
  const trimmed = String(xml).trimStart();
  return (
    trimmed.startsWith("<?xml") &&
    /<urlset\b[^>]*http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9/i.test(trimmed) &&
    !/<html\b|<!doctype html/i.test(trimmed)
  );
};

const getProfileEntries = (xml = "") => {
  const allowedHosts = new Set(["vidhgrow.online", "www.vidhgrow.online"]);
  const seenUsernames = new Set();
  const urlBlocks = String(xml).match(/<url>[\s\S]*?<\/url>/gi) || [];

  return urlBlocks.flatMap((block) => {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]?.trim();
    if (!loc) return [];

    try {
      const parsed = new URL(loc.replace(/&amp;/g, "&"));
      if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.host)) {
        return [];
      }

      const profileMatch =
        parsed.pathname.match(/^\/@([^/]+)$/) ||
        parsed.pathname.match(/^\/profile\/@([^/]+)$/) ||
        parsed.pathname.match(/^\/profile\/([^/]+)$/);
      const username = profileMatch?.[1]
        ? decodeURIComponent(profileMatch[1]).replace(/^@/, "").toLowerCase()
        : "";

      if (!/^[a-z0-9_]{3,20}$/.test(username)) return [];
      if (seenUsernames.has(username)) return [];
      seenUsernames.add(username);

      return [
        {
          username,
          block,
          lastmod: block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim(),
        },
      ];
    } catch {
      return [];
    }
  });
};

const keepSameHostUrlsOnly = (xml = "") => {
  const safeBlocks = getProfileEntries(xml).map(({ block, username }) => {
    const normalizedLoc = `${siteUrl}/profile/${encodeURIComponent(username)}`;
    return block.replace(
      /<loc>[\s\S]*?<\/loc>/i,
      `<loc>${normalizedLoc}</loc>`,
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${safeBlocks.join("\n")}
</urlset>
`;
};

const readExistingSitemap = async () => {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return emptySitemap;
  }
};

const fetchProfileSitemap = async () => {
  const response = await fetch(`${apiBase}/sitemap-profiles.xml`, {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      origin: siteUrl,
      referer: `${siteUrl}/`,
      "user-agent": "VidhgrowFrontendBuildSitemap/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`profile sitemap api returned ${response.status}`);
  }

  return response.text();
};

const fetchLiveProfileSitemap = async () => {
  const response = await fetch(`${siteUrl}/sitemap-profiles.xml?fallback=${Date.now()}`, {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": "VidhgrowFrontendBuildSitemapFallback/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`live profile sitemap returned ${response.status}`);
  }

  return response.text();
};

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

const formatNumber = (value) =>
  Math.max(0, Number(value) || 0).toLocaleString("en-US");

const formatMemberSince = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const profileIdentity = (profile) => {
  const handle = `@${profile.username}`;
  return {
    handle,
    displayName: profile.name || handle,
    heading: profile.name ? `${profile.name} (${handle})` : handle,
  };
};

const profileDescription = (profile) => {
  const { heading } = profileIdentity(profile);
  const tests = formatNumber(profile.stats?.testsCompleted);
  const questions = formatNumber(profile.stats?.questionsAnswered);
  const score = Math.max(
    0,
    Math.min(100, Number(profile.stats?.averagePercentage) || 0),
  );

  return `${heading} on Vidhgrow: ${formatNumber(profile.points)} points, ${tests} completed tests, ${score}% average score, and ${questions} answered questions.`;
};

const fetchProfile = async (username) => {
  const encodedUsername = encodeURIComponent(username);
  const response = await fetch(
    `${apiBase}/api/profile/${encodedUsername}?seoProfile=${encodedUsername}`,
    {
      headers: {
        accept: "application/json",
        origin: siteUrl,
        referer: `${siteUrl}/profile/${encodedUsername}`,
        "user-agent": "VidhgrowFrontendProfileBuild/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`profile api returned ${response.status} for ${username}`);
  }

  const body = await response.json();
  if (!body?.success || body?.data?.username !== username) {
    throw new Error(`profile api returned invalid data for ${username}`);
  }

  return body.data;
};

const fallbackProfile = (username, lastmod) => ({
  username,
  name: "",
  points: 0,
  rank: null,
  stats: {
    testsCompleted: 0,
    questionsAnswered: 0,
    averagePercentage: 0,
    memberSince: lastmod || new Date().toISOString(),
  },
  badges: [],
  recentActivity: [],
});

const renderProfileMarkup = (profile) => {
  const { handle, heading } = profileIdentity(profile);
  const stats = profile.stats || {};
  const memberSince = formatMemberSince(stats.memberSince);
  const badgeMarkup = (profile.badges || [])
    .map(
      (badge) =>
        `<li><strong>${escapeHtml(badge.name || badge.type)}</strong>${
          badge.description ? `: ${escapeHtml(badge.description)}` : ""
        }</li>`,
    )
    .join("");
  const activityMarkup = (profile.recentActivity || [])
    .filter((activity) => activity.courseName)
    .map(
      (activity) => `<li>
        <strong>${escapeHtml(activity.courseName)}</strong>
        <span>${escapeHtml(
          Array.isArray(activity.difficulty)
            ? activity.difficulty.join(", ")
            : activity.difficulty || "practice",
        )} · ${formatNumber(activity.percentage)}%</span>
      </li>`,
    )
    .join("");

  return `<main class="profile-seo-fallback" style="max-width:920px;margin:0 auto;padding:96px 24px 56px;color:#13233d;background:#fff;font:400 17px/1.7 Inter,system-ui,sans-serif">
    <nav aria-label="breadcrumb" style="font-size:14px;margin-bottom:28px;color:#52647e">
      <a href="/" style="color:#2563eb;text-underline-offset:3px">Vidhgrow</a>
      <span aria-hidden="true"> / </span>
      <span>Profile</span>
      <span aria-hidden="true"> / </span>
      <span>${escapeHtml(handle)}</span>
    </nav>
    <article>
      <p style="margin:0 0 8px;color:#2563eb;font-weight:700">Vidhgrow learner profile</p>
      <h1 style="margin:0 0 12px;font-size:clamp(34px,6vw,56px);line-height:1.1;letter-spacing:0;color:#10213c">${escapeHtml(heading)}</h1>
      ${memberSince ? `<p style="color:#52647e">Member since ${escapeHtml(memberSince)}</p>` : ""}
      <section aria-label="public profile statistics" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:32px 0">
        <div style="border:1px solid #dce7f7;border-radius:16px;padding:18px"><strong>${formatNumber(profile.points)}</strong><p>points</p></div>
        <div style="border:1px solid #dce7f7;border-radius:16px;padding:18px"><strong>${profile.rank ? `#${formatNumber(profile.rank)}` : "Not ranked"}</strong><p>global rank</p></div>
        <div style="border:1px solid #dce7f7;border-radius:16px;padding:18px"><strong>${formatNumber(stats.testsCompleted)}</strong><p>tests completed</p></div>
        <div style="border:1px solid #dce7f7;border-radius:16px;padding:18px"><strong>${formatNumber(stats.averagePercentage)}%</strong><p>average score</p></div>
        <div style="border:1px solid #dce7f7;border-radius:16px;padding:18px"><strong>${formatNumber(stats.questionsAnswered)}</strong><p>questions answered</p></div>
      </section>
      ${badgeMarkup ? `<section><h2>Achievements</h2><ul>${badgeMarkup}</ul></section>` : ""}
      ${activityMarkup ? `<section><h2>Recent activity</h2><ul>${activityMarkup}</ul></section>` : ""}
      <p><a href="/courses" style="color:#2563eb;text-underline-offset:3px">Browse Vidhgrow courses and practice tests</a></p>
    </article>
  </main>`;
};

const renderProfileDocument = (sourceDocument, profile) => {
  const { displayName, handle } = profileIdentity(profile);
  const canonical = `${siteUrl}/profile/${encodeURIComponent(profile.username)}`;
  const title = `${displayName} Profile, Scores and Achievements | Vidhgrow`;
  const description = profileDescription(profile);
  const memberSince = new Date(profile.stats?.memberSince);
  const dateCreated = Number.isNaN(memberSince.getTime())
    ? undefined
    : memberSince.toISOString();
  const awards = (profile.badges || [])
    .map((badge) => badge.name)
    .filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Vidhgrow",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Profile",
            item: canonical,
          },
        ],
      },
      {
        "@type": "ProfilePage",
        "@id": `${canonical}#profile`,
        name: `${displayName} on Vidhgrow`,
        description,
        url: canonical,
        ...(dateCreated && { dateCreated }),
        mainEntity: {
          "@type": "Person",
          "@id": `${canonical}#person`,
          name: displayName,
          alternateName: handle,
          identifier: profile.username,
          description,
          ...(awards.length > 0 && { award: awards }),
        },
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
    ],
  };

  let document = sourceDocument
    .replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`,
    )
    .replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, "")
    .replace(/<noscript>[\s\S]*?<\/noscript>/i, "")
    .replace(
      /<div id="root"><\/div>/i,
      `<div id="root">${renderProfileMarkup(profile)}</div>`,
    )
    .replace(
      "</head>",
      `  <link rel="canonical" href="${escapeAttribute(canonical)}" />\n  <script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`,
    );

  document = replaceMeta(document, "name", "title", title);
  document = replaceMeta(document, "name", "description", description);
  document = replaceMeta(document, "property", "og:type", "profile");
  document = replaceMeta(document, "property", "og:title", title);
  document = replaceMeta(document, "property", "og:description", description);
  document = replaceMeta(document, "property", "og:url", canonical);
  document = replaceMeta(document, "name", "twitter:title", title);
  document = replaceMeta(document, "name", "twitter:description", description);
  document = replaceMeta(document, "name", "twitter:url", canonical);

  return document;
};

const writeProfilePages = async (xml) => {
  const sourceDocument = await readFile(sourcePath, "utf8");
  const entries = getProfileEntries(xml).slice(0, 5000);
  let written = 0;

  for (let index = 0; index < entries.length; index += 8) {
    const batch = entries.slice(index, index + 8);
    const results = await Promise.allSettled(
      batch.map(async ({ username, lastmod }) => {
        let profile;

        try {
          profile = await fetchProfile(username);
        } catch (error) {
          console.warn(`Profile data fallback used for ${username}: ${error.message}`);
          profile = fallbackProfile(username, lastmod);
        }

        const pageDirectory = path.join(
          distDirectory,
          "profile",
          profile.username,
        );
        await mkdir(pageDirectory, { recursive: true });
        const document = renderProfileDocument(sourceDocument, profile);
        await writeFile(path.join(pageDirectory, "index.html"), document, "utf8");
        await writeFile(
          path.join(distDirectory, "profile", `${profile.username}.html`),
          document,
          "utf8",
        );
      }),
    );

    results.forEach((result) => {
      if (result.status === "fulfilled") written += 1;
      else console.warn(result.reason?.message || "Profile page build failed");
    });
  }

  console.log(`Profile pages written to dist: ${written}`);
};

let finalSitemap = emptySitemap;

try {
  const upstreamXml = await fetchProfileSitemap();
  if (!hasValidProfileSitemapShape(upstreamXml)) {
    throw new Error("profile sitemap api did not return a valid urlset xml document");
  }

  finalSitemap = keepSameHostUrlsOnly(upstreamXml);
  await writeFile(targetPath, finalSitemap, "utf8");
  console.log("Profile sitemap written to dist");
} catch (error) {
  let fallbackXml = await readExistingSitemap();

  if (!hasValidProfileSitemapShape(fallbackXml) || !getProfileEntries(fallbackXml).length) {
    try {
      fallbackXml = await fetchLiveProfileSitemap();
    } catch (fallbackError) {
      console.warn(`Live profile sitemap fallback failed: ${fallbackError.message}`);
    }
  }

  finalSitemap =
    hasValidProfileSitemapShape(fallbackXml) && getProfileEntries(fallbackXml).length
      ? keepSameHostUrlsOnly(fallbackXml)
      : emptySitemap;
  await writeFile(targetPath, finalSitemap, "utf8");
  console.warn(`Profile sitemap fallback kept: ${error.message}`);
}

await writeProfilePages(finalSitemap);
