/**
 * provides the use seo hook for page logic, browser state, and reusable frontend behavior
 *
 * @file frontend/src/hooks/useseo.js
 * @module frontend/src/hooks/useseo
 * @exports helpers imported by related app modules
 */

import { useHead } from "@unhead/react";
import { useContent } from "../context/ContentContext";

export const useSEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
  canonicalUrl,
  structuredData,
}) => {
  const { contentSettings } = useContent();

  const siteName = contentSettings?.siteName || "Vidhgrow";
  const defaultDescription =
    contentSettings?.siteDescription ||
    "Vidhgrow is the official online learning platform for teacher-led courses, protected practice tests, score feedback, public profiles, and student progress reports.";
  const siteUrl = contentSettings?.siteUrl || window.location.origin;

  const siteLogo = contentSettings?.logo?.url || null;
  const defaultImage = contentSettings?.ogImage || siteLogo;

  const twitterHandle = contentSettings?.social?.twitterHandle || "";
  const themeColor = contentSettings?.themeColor || "#3b82f6";

  const fullTitle = title ? `${title} - ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const cleanPath = window.location.pathname;
  const finalUrl = canonicalUrl || `${siteUrl}${cleanPath}`;

  // prepare meta tags array
  const metaTags = [
    // basic meta tags
    { name: "description", content: finalDescription },
    {
      name: "keywords",
      content:
        keywords || `${siteName}, online learning, test preparation, courses`,
    },
    { name: "author", content: author || siteName },

    // robots
    ...(noindex
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : [
          {
            name: "robots",
            content:
              "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
          },
        ]),

    // open graph - basic
    { property: "og:type", content: type },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: finalDescription },
    ...(finalImage
      ? [
          { property: "og:image", content: finalImage },
          { property: "og:image:secure_url", content: finalImage },
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
          { property: "og:image:alt", content: fullTitle },
        ]
      : []),
    { property: "og:url", content: finalUrl },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "en_US" },

    // open graph - optional
    ...(publishedTime
      ? [{ property: "article:published_time", content: publishedTime }]
      : []),
    ...(modifiedTime
      ? [{ property: "article:modified_time", content: modifiedTime }]
      : []),

    // twitter card
    { name: "twitter:card", content: "summary_large_image" },
    ...(twitterHandle
      ? [
          { name: "twitter:site", content: twitterHandle },
          { name: "twitter:creator", content: twitterHandle },
        ]
      : []),
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: finalDescription },
    ...(finalImage
      ? [
          { name: "twitter:image", content: finalImage },
          { name: "twitter:image:alt", content: fullTitle },
        ]
      : []),

    // itional seo
    { name: "theme-color", content: themeColor },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
    },
    { name: "format-detection", content: "telephone=no" },
    { httpEquiv: "x-ua-compatible", content: "IE=edge" },

    // apple mobile web app
    { name: "apple-mobile-web-app-capable", content: "yes" },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    },
    { name: "apple-mobile-web-app-title", content: siteName },

  ];

  // prepare link tags array
  const linkTags = [
    ...(!noindex ? [{ rel: "canonical", href: finalUrl }] : []),
  ];

  // prepare script tags for structured data
  const scriptTags = [];

  // google analytics
  scriptTags.push({
    src: "https://www.googletagmanager.com/gtag/js?id=G-GQK7Y7WTG1",
    async: true,
  });

  // ed google aanlytics
  scriptTags.push({
    innerHTML: `
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
      window.gtag("js", new Date());

      window.gtag("config", "G-GQK7Y7WTG1");
    `,
  });
  // cleaner to remove null, undefined, empty strings, empty arrays, empty objects
  const removeNulls = (obj) =>
    JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === "object" &&
            value !== null &&
            Object.keys(value).length === 0)
        ) {
          return undefined;
        }
        return value;
      }),
    );

  // basic organization structured data
  const organizationSchema = removeNulls({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: siteName,
    alternateName: `${siteName} Learning`,
    url: siteUrl,
    logo: siteLogo,
    description: defaultDescription,
    knowsAbout: [
      "online learning",
      "teacher-led courses",
      "practice tests",
      "student progress tracking",
      "teacher applications",
      "course creation",
    ],
    subjectOf: [
      {
        "@type": "Blog",
        name: `${siteName} Blog`,
        url: "https://blogs.vidhgrow.online/",
      },
    ],
    ...(contentSettings?.social && {
      sameAs: Object.values(contentSettings.social).filter(Boolean),
    }),
  });

  scriptTags.push({
    type: "application/ld+json",
    innerHTML: JSON.stringify(removeNulls(organizationSchema)),
  });

  const websiteSchema = removeNulls({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: siteName,
    alternateName: `${siteName} Learning`,
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/courses?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });

  scriptTags.push({
    type: "application/ld+json",
    innerHTML: JSON.stringify(removeNulls(websiteSchema)),
  });

  // custom structured data if provided
  if (structuredData) {
    scriptTags.push({
      type: "application/ld+json",
      innerHTML: JSON.stringify(removeNulls(structuredData)),
    });
  }

  useHead({
    title: fullTitle,
    meta: metaTags,
    link: linkTags,
    script: scriptTags,
  });
};
