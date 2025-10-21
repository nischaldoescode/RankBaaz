import { useEffect } from 'react';
import { useHead } from '@unhead/react';
import { useContent } from '../context/ContentContext';

export const useSEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
  canonicalUrl, // NEW: Allow custom canonical
  structuredData, // NEW: Allow structured data
}) => {
  const { contentSettings } = useContent();

  const siteName = contentSettings?.siteName || 'TestMaster Pro';
  const defaultDescription = contentSettings?.siteDescription || 'Transform how students learn and prepare for exams through intelligent testing.';
  const siteUrl = contentSettings?.siteUrl || window.location.origin;
  
  // Use logo from contentSettings if available
  const siteLogo = contentSettings?.logo?.url || `${siteUrl}/logo.png`;
  const defaultImage = contentSettings?.ogImage || siteLogo;
  
  const twitterHandle = contentSettings?.social?.twitter || '@testmasterpro';
  const themeColor = contentSettings?.themeColor || '#3b82f6';

  const fullTitle = title ? `${title} - ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = canonicalUrl || url || window.location.href;

  // Prepare meta tags array
  const metaTags = [
    // Basic Meta Tags
    { name: 'description', content: finalDescription },
    { name: 'keywords', content: keywords || `${siteName}, online learning, test preparation, courses` },
    { name: 'author', content: author || siteName },
    
    // Robots
    ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : [
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' }
    ]),
    
    // Open Graph - Basic
    { property: 'og:type', content: type },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: finalDescription },
    { property: 'og:image', content: finalImage },
    { property: 'og:image:secure_url', content: finalImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: fullTitle },
    { property: 'og:url', content: finalUrl },
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: 'en_US' },
    
    // Open Graph - Optional
    ...(publishedTime ? [{ property: 'article:published_time', content: publishedTime }] : []),
    ...(modifiedTime ? [{ property: 'article:modified_time', content: modifiedTime }] : []),
    
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: twitterHandle },
    { name: 'twitter:creator', content: twitterHandle },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: finalDescription },
    { name: 'twitter:image', content: finalImage },
    { name: 'twitter:image:alt', content: fullTitle },
    
    // Additional SEO
    { name: 'theme-color', content: themeColor },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0' },
    { name: 'format-detection', content: 'telephone=no' },
    { httpEquiv: 'x-ua-compatible', content: 'IE=edge' },
    
    // Apple Mobile Web App
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: siteName },
  ];

  // Prepare link tags array
  const linkTags = [
    { rel: 'canonical', href: finalUrl },
    { rel: 'icon', type: 'image/png', href: siteLogo },
    { rel: 'apple-touch-icon', href: siteLogo },
  ];

  // Prepare script tags for structured data
  const scriptTags = [];
  
  // Add basic Organization structured data
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    logo: siteLogo,
    description: defaultDescription,
    ...(contentSettings?.social && {
      sameAs: Object.values(contentSettings.social).filter(Boolean)
    })
  };
  
  scriptTags.push({
    type: 'application/ld+json',
    innerHTML: JSON.stringify(organizationSchema),
  });

  // Add WebSite structured data
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/courses?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  
  scriptTags.push({
    type: 'application/ld+json',
    innerHTML: JSON.stringify(websiteSchema),
  });

  // Add custom structured data if provided
  if (structuredData) {
    scriptTags.push({
      type: 'application/ld+json',
      innerHTML: JSON.stringify(structuredData),
    });
  }

  useHead({
    title: fullTitle,
    meta: metaTags,
    link: linkTags,
    script: scriptTags,
  });
};