import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Calendar, FileText } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useTheme } from "../context/ThemeContext";
import Loading from "../components/common/Loading";
import { useContent } from "../context/ContentContext";

const PrivacyPolicy = () => {
  const { contentSettings } = useContent();
  const { legalPages, fetchLegalPage, loading } = useContent();
  const { animations, reducedMotion } = useTheme();
  const [page, setPage] = useState(null);
  
  useEffect(() => {
    const loadPage = async () => {
      if (legalPages.privacy) {
        setPage(legalPages.privacy);
      } else {
        const data = await fetchLegalPage("privacy");
        if (data) setPage(data);
      }
    };

    loadPage();
  }, [legalPages.privacy]);

  // SEO Configuration - only runs when page is loaded
  useSEO({
    title: page?.title || 'Privacy Policy',
    description: `Read ${contentSettings?.siteName || 'TestMaster Pro'}'s Privacy Policy to understand how we collect, use, and protect your personal information.`,
    keywords: 'privacy policy, data protection, personal information, privacy rights, GDPR, user privacy',
    type: 'article',
    author: contentSettings?.siteName || 'TestMaster Pro',
    publishedTime: page?.metadata?.effectiveDate,
    modifiedTime: page?.lastUpdated,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page?.title || 'Privacy Policy',
      description: `Privacy Policy for ${contentSettings?.siteName || 'TestMaster Pro'}`,
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
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {page.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
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

                    {/* ← ADD THIS: Section Content (paragraph text) */}
                    {section.content && section.content.trim() !== "" && (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    )}

                    {/* ← MODIFIED: Subheaders with title and points */}
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
        </motion.div>

        {/* Metadata Display */}
        {page.metadata && (
          <motion.div
            variants={itemVariants}
            className="bg-muted/50 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Policy Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {page.metadata.effectiveDate && (
                <div>
                  <span className="text-muted-foreground">Effective Date:</span>
                  <p className="font-medium text-foreground mt-1">
                    {new Date(page.metadata.effectiveDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {page.metadata.lastReviewedDate && (
                <div>
                  <span className="text-muted-foreground">Last Reviewed:</span>
                  <p className="font-medium text-foreground mt-1">
                    {new Date(
                      page.metadata.lastReviewedDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
              {page.metadata.nextReviewDate && (
                <div>
                  <span className="text-muted-foreground">Next Review:</span>
                  <p className="font-medium text-foreground mt-1">
                    {new Date(
                      page.metadata.nextReviewDate
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Contact Section */}
        <motion.div
          variants={itemVariants}
          className="bg-muted/50 rounded-xl p-6 text-center"
        >
          <p className="text-muted-foreground mb-4">
            Have questions about our privacy policy?
          </p>

          <a
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
          >
            Contact Us
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
