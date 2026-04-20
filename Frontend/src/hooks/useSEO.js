import { useEffect } from "react";
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
    "Transform how students learn and prepare for exams through intelligent testing.";
  const siteUrl = contentSettings?.siteUrl || window.location.origin;

  // Use logo from contentSettings if available
  const siteLogo = contentSettings?.logo?.url || `${siteUrl}/logo.png`;
  const defaultImage = contentSettings?.ogImage || siteLogo;

  const twitterHandle = contentSettings?.social?.twitter || "@testmasterpro";
  const themeColor = contentSettings?.themeColor || "#3b82f6";

  const fullTitle = title ? `${title} - ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const cleanPath = window.location.pathname;
  const finalUrl = canonicalUrl || `${siteUrl}${cleanPath}`;

  // Prepare meta tags array
  const metaTags = [
    // Basic Meta Tags
    { name: "description", content: finalDescription },
    {
      name: "keywords",
      content:
        keywords || `${siteName}, online learning, test preparation, courses`,
    },
    { name: "author", content: author || siteName },

    // Robots
    ...(noindex
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : [
          {
            name: "robots",
            content:
              "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
          },
        ]),

    // Open Graph - Basic
    { property: "og:type", content: type },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: finalDescription },
    { property: "og:image", content: finalImage },
    { property: "og:image:secure_url", content: finalImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: fullTitle },
    { property: "og:url", content: finalUrl },
    { property: "og:site_name", content: siteName },
    { property: "og:locale", content: "en_US" },

    // Open Graph - Optional
    ...(publishedTime
      ? [{ property: "article:published_time", content: publishedTime }]
      : []),
    ...(modifiedTime
      ? [{ property: "article:modified_time", content: modifiedTime }]
      : []),

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: twitterHandle },
    { name: "twitter:creator", content: twitterHandle },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: finalDescription },
    { name: "twitter:image", content: finalImage },
    { name: "twitter:image:alt", content: fullTitle },

    // Additional SEO
    { name: "theme-color", content: themeColor },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
    },
    { name: "format-detection", content: "telephone=no" },
    { httpEquiv: "x-ua-compatible", content: "IE=edge" },

    // Apple Mobile Web App
    { name: "apple-mobile-web-app-capable", content: "yes" },
    {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    },
    { name: "apple-mobile-web-app-title", content: siteName },
  ];

  // Prepare link tags array
  const linkTags = [
    ...(!noindex ? [{ rel: "canonical", href: finalUrl }] : []),
    { rel: "icon", type: "image/png", href: siteLogo },
    { rel: "apple-touch-icon", href: siteLogo },
  ];

  // Prepare script tags for structured data
  const scriptTags = [];

  // Add Google Analytics
  scriptTags.push({
    src: "https://www.googletagmanager.com/gtag/js?id=G-GQK7Y7WTG1",
    async: true,
  });

  // Added Google Aanlytics
  scriptTags.push({
    innerHTML: `
      window.dataLayer = window.dataLayer || [];
      gtag("js", new Date());

      gtag("config", "G-GQK7Y7WTG1");
    `,
  });
  // CLEANER to remove null, undefined, empty strings, empty arrays, empty objects
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

  // Add basic Organization structured data
  const organizationSchema = removeNulls({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: siteLogo,
    description: defaultDescription,
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
    name: siteName,
    url: siteUrl,
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

  // Add custom structured data if provided
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
