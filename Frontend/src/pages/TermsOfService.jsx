import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scale, Calendar, FileText } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useTheme } from "../context/ThemeContext";
import ReactMarkdown from "react-markdown";
import Loading from "../components/common/Loading";
import { useSEO } from "../hooks/useSEO";

const TermsOfService = () => {
  const { legalPages, fetchLegalPage, loading, contentSettings } = useContent();
  const { animations, reducedMotion } = useTheme();
  const [page, setPage] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      if (legalPages.terms) {
        setPage(legalPages.terms);
      } else {
        const data = await fetchLegalPage("terms");
        if (data) setPage(data);
      }
    };

    loadPage();
  }, [legalPages.terms]);

  // SEO Configuration - only runs when page is loaded
  useSEO({
    title: page?.title || 'Terms of Service',
    description: `Read ${contentSettings?.siteName || 'TestMaster Pro'}'s Terms of Service to understand the rules and regulations for using our platform.`,
    keywords: 'terms of service, terms and conditions, user agreement, terms of use, legal agreement, service rules',
    type: 'article',
    author: contentSettings?.siteName || 'TestMaster Pro',
    publishedTime: page?.metadata?.effectiveDate,
    modifiedTime: page?.lastUpdated,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page?.title || 'Terms of Service',
      description: `Terms of Service for ${contentSettings?.siteName || 'TestMaster Pro'}`,
      url: window.location.href,
      datePublished: page?.metadata?.effectiveDate,
      dateModified: page?.lastUpdated,
      inLanguage: 'en-US',
      isPartOf: {
        '@type': 'WebSite',
        name: contentSettings?.siteName || 'TestMaster Pro',
        url: contentSettings?.siteUrl || window.location.origin
      },
      publisher: {
        '@type': 'Organization',
        name: contentSettings?.siteName || 'TestMaster Pro',
        logo: {
          '@type': 'ImageObject',
          url: contentSettings?.logo?.url || `${contentSettings?.siteUrl || window.location.origin}/logo.png`
        }
      }
    }
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading || !page) {
    return <Loading variant="page" />;
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animations && !reducedMotion ? "hidden" : "visible"}
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {page.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Version {page.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Last Updated:{" "}
                  {new Date(page.lastUpdated).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            variants={itemVariants}
            className="bg-card border border-border rounded-2xl p-8 md:p-12"
          >
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1
                      className="text-3xl font-bold text-foreground mt-8 mb-4"
                      {...props}
                    />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-2xl font-bold text-foreground mt-6 mb-3"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3
                      className="text-xl font-semibold text-foreground mt-4 mb-2"
                      {...props}
                    />
                  ),
                  p: ({ node, ...props }) => (
                    <p
                      className="text-muted-foreground leading-relaxed mb-4"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul
                      className="list-disc list-inside space-y-2 mb-4 text-muted-foreground"
                      {...props}
                    />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol
                      className="list-decimal list-inside space-y-2 mb-4 text-muted-foreground"
                      {...props}
                    />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="ml-4" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong
                      className="font-semibold text-foreground"
                      {...props}
                    />
                  ),
                  a: ({ node, ...props }) => (
                    <a
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                }}
              >
                {page.content}
              </ReactMarkdown>
            </div>
          </motion.div>

          {page.sections && page.sections.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-card border border-border rounded-2xl p-8 md:p-12 space-y-8"
            >
              {page.sections
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (
                  <div key={index} className="space-y-4">
                    {/* Section Header */}
                    <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
                      {section.header}
                    </h2>

                    {/* Section Content (paragraph text if exists) */}
                    {section.content && section.content.trim() !== "" && (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    )}

                    {/* Subheaders with titles and points */}
                    {section.subheaders && section.subheaders.length > 0 && (
                      <div className="space-y-4">
                        {section.subheaders
                          .sort((a, b) => a.order - b.order)
                          .map((subheader, subIndex) => (
                            <div key={subIndex} className="ml-6">
                              {/* Subheader Title (if exists) */}
                              {subheader.title &&
                                subheader.title.trim() !== "" && (
                                  <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {subheader.title}
                                  </h3>
                                )}

                              {/* Bullet Points (if exist) */}
                              {subheader.points &&
                                subheader.points.length > 0 && (
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                                    {subheader.points.map(
                                      (point, pointIndex) => (
                                        <li
                                          key={pointIndex}
                                          className="leading-relaxed"
                                        >
                                          {point}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
            </motion.div>
          )}

          {/* Important Notice */}
          <motion.div
            variants={itemVariants}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Important Notice
            </h3>
            <p className="text-muted-foreground text-sm">
              By using our platform, you agree to these terms. Please read them
              carefully. If you do not agree with these terms, please do not use
              our services.
            </p>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            variants={itemVariants}
            className="bg-muted/50 rounded-xl p-6 text-center"
          >
            <p className="text-muted-foreground mb-4">
              Questions about our terms?
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
            >
              Contact Us
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
