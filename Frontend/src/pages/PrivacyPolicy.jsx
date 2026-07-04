/**
 * renders the public privacy policy page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/privacypolicy.jsx
 * @module frontend/src/pages/privacypolicy
 * @exports route component rendered by the client router
 */

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Calendar, FileText } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useTheme } from "../context/ThemeContext";
import Loading from "../components/common/Loading";
import { useSEO } from "../hooks/useSEO";
const PrivacyPolicy = () => {
  const { legalPages, fetchLegalPage, loading, contentSettings } = useContent();
  const { animations, reducedMotion } = useTheme();
  const [page, setPage] = useState(null);
  const siteName = contentSettings?.siteName || "Vidhgrow";
  const siteUrl = contentSettings?.siteUrl || window.location.origin;
  const privacyDescription =
    "Read how Vidhgrow handles student accounts, teacher profiles, course activity, documents, test progress, payments, cookies, security, and privacy choices.";

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

  // seo setup - only runs when page is loaded
  useSEO({
    title: "Privacy Policy for Students, Teachers, and Courses",
    description: privacyDescription,
    keywords:
      "Vidhgrow privacy policy, student data privacy, teacher document privacy, course activity data, account security, privacy rights",
    type: "article",
    author: siteName,
    publishedTime: page?.metadata?.effectiveDate,
    modifiedTime: page?.lastUpdated,
    canonicalUrl: `${siteUrl}/privacy`,

    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${siteName} Privacy Policy`,
      description: privacyDescription,
      url: window.location.href,
      datePublished: page?.metadata?.effectiveDate,
      dateModified: page?.lastUpdated,
      inLanguage: "en-US",
      isPartOf: {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
      },
      publisher: {
        "@type": "Organization",
        name: siteName,
        ...(contentSettings?.logo?.url && {
          logo: {
            "@type": "ImageObject",
            url: contentSettings.logo.url,
          },
        }),
      },
    },
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
    <div className="vg-static-page min-h-screen pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animations && !reducedMotion ? "hidden" : "visible"}
          animate="visible"
          variants={containerVariants}
          className="space-y-8"
        >
          {/* header */}
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

          <motion.section
            variants={itemVariants}
            className="grid gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-sm sm:grid-cols-3"
          >
            {[
              {
                label: "account data",
                text: "how profile details, verification state, and sign-in security are handled",
              },
              {
                label: "learning activity",
                text: "how course progress, test attempts, feedback, and completion signals are used",
              },
              {
                label: "support choices",
                text: "how to contact Vidhgrow for privacy questions, corrections, or account requests",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border/70 bg-background/55 p-4">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </motion.section>

          {page.sections && page.sections.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-card border border-border rounded-2xl p-8 md:p-12 space-y-8"
            >
              {page.sections
                .sort((a, b) => a.order - b.order)
                .map((section, index) => (
                  <div key={index} className="space-y-4">
                    {/* section header */}
                    <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
                      {section.header}
                    </h2>

                    {/* ← this: section content (paragraph text) */}
                    {section.content && section.content.trim() !== "" && (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    )}

                    {/* ← modified: subheaders with title and points */}
                    {section.subheaders && section.subheaders.length > 0 && (
                      <div className="space-y-4">
                        {section.subheaders
                          .sort((a, b) => a.order - b.order)
                          .map((subheader, subIndex) => (
                            <div key={subIndex} className="ml-6">
                              {/* subheader title (if exists) */}
                              {subheader.title &&
                                subheader.title.trim() !== "" && (
                                  <h3 className="text-lg font-semibold text-foreground mb-2">
                                    {subheader.title}
                                  </h3>
                                )}

                              {/* bullet points (if exist) */}
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

        {/* metadata display */}
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

        {/* contact section */}
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
