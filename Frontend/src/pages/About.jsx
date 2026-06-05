/**
 * renders the public about page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/about.jsx
 * @module frontend/src/pages/about
 * @exports route component rendered by the client router
 */

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useContent } from "../context/ContentContext";
import Loading from "../components/common/Loading";
import { useSEO } from "../hooks/useSEO";

const fallbackStats = [
  { value: "Teacher-led", label: "Courses and notes" },
  { value: "Timed", label: "Practice tests" },
  { value: "Clear", label: "Progress reports" },
];

const storyPoints = [
  {
    title: "Mission",
    text: "Make serious practice easier to begin, easier to repeat, and easier to understand after every attempt.",
  },
  {
    title: "Values",
    text: "Keep the product accessible, readable, and useful for students and teachers doing real work.",
  },
  {
    title: "Community",
    text: "Support learners who want structured courses, calm testing, and feedback they can act on.",
  },
];

const looksInflated = (value = "") => /50,?000|1m\+|95%/i.test(value);

const legacyAboutValue = (value) =>
  /^Our\s/i.test(value?.title || "") ||
  /democratize quality education|data-driven insights|full potential/i.test(
    value?.description || "",
  );

const getDisplayStats = (stats = []) => {
  if (!stats.length || stats.some((stat) => looksInflated(stat.value))) {
    return fallbackStats;
  }
  return stats.slice(0, 3);
};

const getDisplayStoryPoints = (values = []) => {
  if (!values.length || values.some(legacyAboutValue)) return storyPoints;

  return values.slice(0, 3).map((value) => ({
    title: String(value.title || "").replace(/^Our\s+/i, "") || "Story",
    text: value.description || "",
  }));
};

const AboutImageSlot = ({ image }) => {
  const [hasImage, setHasImage] = useState(true);
  const imageSrc = image?.url || image?.fallbackSrc || "/images/about-learning-workspace.webp";
  const imageAlt =
    image?.alt || "Students and teachers reviewing course progress together";

  if (!hasImage) {
    return (
      <div className="vg-about-image-fallback">
        <span>image</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      className="vg-about-image"
      loading="lazy"
      onError={() => setHasImage(false)}
    />
  );
};

const About = () => {
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, loading } = useContent();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [62, -10, -72]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1.035, 0.99]);
  const imageRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-1.4, 0.3, 1.1]);

  useSEO({
    title: "About Us",
    description: `Learn more about ${
      contentSettings?.siteName || "Vidhgrow"
    }, a course and test practice platform for clearer study progress.`,
    keywords: "about, vidhgrow, courses, practice tests, student progress",
    type: "website",
    canonicalUrl: `${contentSettings?.siteUrl || window.location.origin}/about`,
  });

  if (loading && !contentSettings) {
    return <Loading variant="page" />;
  }

  const siteName = contentSettings?.siteName || "Vidhgrow";
  const stats = getDisplayStats(contentSettings?.aboutStats || []);
  const aboutHero = {
    eyebrow: contentSettings?.aboutHeroEyebrow || `About ${siteName}`,
    title:
      contentSettings?.aboutHeroTitle ||
      "A calmer place for courses, tests, and the next revision.",
    description:
      contentSettings?.aboutHeroDescription ||
      "Vidhgrow is built for learners who want structure without noise: course material, timed practice, teacher context, and progress signals in one focused workspace.",
    image: contentSettings?.aboutHeroImage,
  };
  const aboutValuesEyebrow =
    contentSettings?.aboutValuesEyebrow || "What drives us";
  const aboutValuesTitle =
    contentSettings?.aboutValuesTitle || "Useful tools for real study habits.";
  const aboutStoryPoints = getDisplayStoryPoints(contentSettings?.aboutValues);
  const aboutCtaTitle =
    contentSettings?.aboutCtaTitle ||
    "Start with one course. Keep the work visible.";
  const aboutCtaDescription =
    contentSettings?.aboutCtaDescription ||
    "Browse available courses or create an account to keep attempts, reports, and revision steps together.";
  const motionProps =
    animations && !reducedMotion
      ? {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-80px" },
          transition: { duration: 0.55 },
        }
      : {};

  return (
    <div className="vg-static-page min-h-screen pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section ref={heroRef} className="vg-about-hero">
          <motion.div {...motionProps} className="vg-about-copy">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              {aboutHero.eyebrow}
            </p>
            <h1>{aboutHero.title}</h1>
            <p>{aboutHero.description}</p>

            <div className="vg-about-stats" aria-label="Vidhgrow platform focus">
              {stats.map((stat) => (
                <div key={`${stat.value}-${stat.label}`}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...motionProps}
            transition={{ duration: 0.6, delay: 0.08 }}
            style={
              reducedMotion
                ? undefined
                : { y: imageY, scale: imageScale, rotate: imageRotate }
            }
            className="vg-about-image-frame"
          >
            <AboutImageSlot image={aboutHero.image} />
          </motion.div>
        </section>

        <motion.section {...motionProps} className="vg-about-values">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              {aboutValuesEyebrow}
            </p>
            <h2>{aboutValuesTitle}</h2>
          </div>

          <div className="vg-about-value-list">
            {aboutStoryPoints.map((point) => (
              <article key={point.title}>
                <span>{point.title}</span>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section {...motionProps} className="vg-about-cta">
          <div>
            <h2>{aboutCtaTitle}</h2>
            <p>{aboutCtaDescription}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="vg-about-link-primary">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/courses" className="vg-about-link-secondary">
              Browse courses
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default About;
