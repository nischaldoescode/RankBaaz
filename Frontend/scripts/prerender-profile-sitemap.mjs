/**
 * writes the public profile sitemap into the frontend build output
 *
 * @returns {Promise<void>} keeps /sitemap-profiles.xml as xml instead of the spa fallback
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDirectory = path.resolve(process.env.VITE_OUT_DIR || "dist");
const targetPath = path.join(distDirectory, "sitemap-profiles.xml");
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

const hasValidProfileSitemapShape = (xml = "") => {
  const trimmed = String(xml).trimStart();
  return (
    trimmed.startsWith("<?xml") &&
    /<urlset\b[^>]*http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9/i.test(trimmed) &&
    !/<html\b|<!doctype html/i.test(trimmed)
  );
};

const keepSameHostUrlsOnly = (xml = "") => {
  const allowedHosts = new Set(["vidhgrow.online", "www.vidhgrow.online"]);
  const urlBlocks = String(xml).match(/<url>[\s\S]*?<\/url>/gi) || [];
  const safeBlocks = urlBlocks.flatMap((block) => {
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

      if (!profileMatch?.[1]) return [];

      const username = encodeURIComponent(decodeURIComponent(profileMatch[1]).replace(/^@/, ""));
      const normalizedLoc = `${siteUrl}/profile/${username}`;
      return [block.replace(/<loc>[\s\S]*?<\/loc>/i, `<loc>${normalizedLoc}</loc>`)];
    } catch {
      return [];
    }
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

try {
  const upstreamXml = await fetchProfileSitemap();
  if (!hasValidProfileSitemapShape(upstreamXml)) {
    throw new Error("profile sitemap api did not return a valid urlset xml document");
  }

  await writeFile(targetPath, keepSameHostUrlsOnly(upstreamXml), "utf8");
  console.log("Profile sitemap written to dist");
} catch (error) {
  const existing = await readExistingSitemap();
  const fallback = hasValidProfileSitemapShape(existing) ? existing : emptySitemap;
  await writeFile(targetPath, fallback, "utf8");
  console.warn(`Profile sitemap fallback kept: ${error.message}`);
}
