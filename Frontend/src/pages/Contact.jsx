import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useTheme } from "../context/ThemeContext";
import Loading from "../components/common/Loading";
import { useHead } from '@unhead/react';

const Contact = () => {
  const { contactInfo, loading } = useContent();
  const { animations, reducedMotion } = useTheme();
  
  useSEO({
    title: "Contact Us",
    description: `Get in touch with ${
      contentSettings?.siteName || "RankBaaz"
    }. We're here to help with your questions and support needs.`,
    keywords: "contact, support, help, email, telegram, customer service",
    type: "website",
  });

  const handleEmailClick = () => {
    window.location.href = "hello@testmasterpro.com";
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading && !contactInfo) {
    return <Loading variant="page" />;
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animations && !reducedMotion ? "hidden" : "visible"}
          animate="visible"
          variants={containerVariants}
          className="space-y-12"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and
              we'll respond as soon as possible.
            </p>
          </motion.div>

          {/* Contact Cards */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {/* Email Card - Only Support */}
            {contactInfo?.email?.support && (
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Email Support
                </h3>

                <a
                  href={`mailto:${contactInfo.email.support}`}
                  className="text-primary hover:underline break-all text-sm"
                >
                  {contactInfo.email.support}
                </a>
              </div>
            )}

            {/* Telegram Card - NEW */}
            {contactInfo?.telegram?.support && (
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Telegram Support
                </h3>

                <a
                  href={`https://t.me/${contactInfo.telegram.support.replace(
                    "@",
                    ""
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  {contactInfo.telegram.support}
                </a>
              </div>
            )}

            {/* Address Card - Conditional (only if city exists) */}
            {contactInfo?.address?.city && (
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Visit Us
                </h3>
                <p className="text-muted-foreground text-sm">
                  {contactInfo.address.street && (
                    <>
                      {contactInfo.address.street}
                      <br />
                    </>
                  )}
                  {contactInfo.address.city}
                  {contactInfo.address.state &&
                    `, ${contactInfo.address.state}`}
                  {contactInfo.address.zipCode &&
                    ` ${contactInfo.address.zipCode}`}
                  {contactInfo.address.country && (
                    <>
                      <br />
                      {contactInfo.address.country}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Business Hours Card */}
            {contactInfo?.businessHours && (
              <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Business Hours
                </h3>
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {contactInfo.businessHours}
                </p>
              </div>
            )}
          </motion.div>

          {/* Contact Form Section */}
          <motion.div
            variants={itemVariants}
            className="bg-card border border-border rounded-2xl p-8 md:p-12 max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Send Us a Message
              </h2>
              <p className="text-muted-foreground">
                Click the button below to compose an email in your default email
                client
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  We'll get back to you within 24-48 hours during business days
                </p>
                <button
                  onClick={handleEmailClick}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  Open Email Client
                </button>
              </div>

              {/* Additional Contact Methods - Updated */}
              {(contactInfo?.email?.support ||
                contactInfo?.telegram?.support) && (
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Quick Contact
                  </h3>
                  <div className="space-y-2">
                    {contactInfo?.email?.support && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>Email:</span>

                        <a
                          href={`mailto:${contactInfo.email.support}`}
                          className="text-primary hover:underline"
                        >
                          {contactInfo.email.support}
                        </a>
                      </div>
                    )}
                    {contactInfo?.telegram?.support && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span>Telegram:</span>

                        <a
                          href={`https://t.me/${contactInfo.telegram.support.replace(
                            "@",
                            ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {contactInfo.telegram.support}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* FAQ Teaser */}
          <motion.div
            variants={itemVariants}
            className="text-center bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Looking for Quick Answers?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Check out our FAQ section for instant answers to common questions
            </p>

            <Link
              to="/#faqs"
              onClick={() => {
                // Scroll to FAQs after navigation
                setTimeout(() => {
                  const faqSection = document.getElementById("faqs");
                  if (faqSection) {
                    faqSection.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 100);
              }}
              className="inline-flex items-center justify-center px-6 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors font-medium cursor-pointer"
            >
              View FAQs
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
