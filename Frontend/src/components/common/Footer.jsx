import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Phone,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "../../context/ThemeContext";
import { useContent } from "../../context/ContentContext";
import CachedImage from "./CachedImage";

const Footer = () => {
  const { animations, reducedMotion } = useTheme();
  const { contactInfo, contentSettings, loading } = useContent();
  const currentYear = new Date().getFullYear();

  // Get dynamic data
  const siteName = contentSettings?.siteName || "RankBaaz Pro";
  const footerDescription =
    contactInfo?.footerDescription ||
    "Empowering students with comprehensive test preparation and learning management tools. Master your exams with confidence.";
  const copyrightText = (
    contactInfo?.copyrightText || "© {year} RankBaaz Pro. All rights reserved."
  ).replace("{year}", currentYear);

  const quickLinks =
    contactInfo?.quickLinks
      ?.filter((link) => link.name && link.href)
      .sort((a, b) => a.order - b.order) || [];

  // If no quick links from DB, use defaults
  const displayQuickLinks =
    quickLinks.length > 0
      ? quickLinks
      : [
          { name: "Home", href: "/" },
          { name: "About", href: "/about" },
          { name: "Contact", href: "/contact" },
        ];

  // Resources (static)
  const resources = [
    { name: "Help Center", href: "/help" },
    { name: "FAQs", href: "/#faqs" },
  ];

  // Social media icons mapping
  const socialIcons = {
    instagram: Instagram,
    twitter: Twitter,
    facebook: Facebook,
    linkedin: Linkedin,
    youtube: Youtube,
    telegram: MessageSquare,
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const motionProps =
    animations && !reducedMotion
      ? {
          variants: containerVariants,
          initial: "hidden",
          whileInView: "visible",
          viewport: { once: true, margin: "-50px" },
        }
      : {};

  const itemMotionProps =
    animations && !reducedMotion
      ? {
          variants: itemVariants,
        }
      : {};

  return (
    <>
      <motion.footer {...motionProps} className="border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
            {/* Brand section */}
            <motion.div
              {...itemMotionProps}
              className="col-span-1 sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center gap-3 mb-4">
                {contentSettings?.logo?.url ? (
                  <CachedImage
                    src={contentSettings.logo.url}
                    alt={siteName}
                    className="h-12 w-auto object-contain rounded-xl"
                    fallback={
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-primary-foreground" />
                      </div>
                    }
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <span className="text-lg font-bold text-foreground">
                  {siteName}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {footerDescription}
              </p>

              {/* Social media - Dynamic */}
              {contactInfo?.socialMedia &&
                Object.entries(contactInfo.socialMedia).some(
                  ([key, value]) => value
                ) && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">
                      Follow us:
                    </span>
                    <div className="flex gap-2">
                      {Object.entries(contactInfo.socialMedia).map(
                        ([platform, url]) => {
                          if (!url) return null;
                          const Icon = socialIcons[platform];
                          if (!Icon) return null;

                          return (
                            <Button
                              key={platform}
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              asChild
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Follow us on ${platform}`}
                              >
                                <Icon className="h-4 w-4" />
                              </a>
                            </Button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </motion.div>

            {/* Quick Links - Dynamic */}
            <motion.div {...itemMotionProps} className="col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {displayQuickLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Resources */}
            <motion.div {...itemMotionProps} className="col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Resources
              </h3>
              <ul className="space-y-3">
                {resources.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Contact - Dynamic */}
            <motion.div {...itemMotionProps} className="col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Contact Us
              </h3>

              <div className="space-y-3">
                {contactInfo?.email?.support && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <a
                      href={`mailto:${contactInfo.email.support}`}
                      className="hover:text-foreground transition-colors break-all"
                    >
                      {contactInfo.email.support}
                    </a>
                  </div>
                )}
                {contactInfo?.telegram?.support && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <a
                      href={`https://t.me/${contactInfo.telegram.support.replace(
                        "@",
                        ""
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      {contactInfo.telegram.support}
                    </a>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Legal - Static */}
            <motion.div {...itemMotionProps} className="col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Legal
              </h3>

              <ul className="space-y-3">
                <li>
                  <Link
                    to="/privacy"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        <Separator className="my-4 sm:my-6" />

        {/* Bottom section - Dynamic copyright */}
        <motion.div {...itemMotionProps} className="flex justify-center mb-3">
          <p className="text-sm text-muted-foreground text-center">
            {copyrightText}
          </p>
        </motion.div>
      </motion.footer>
    </>
  );
};

export default Footer;
