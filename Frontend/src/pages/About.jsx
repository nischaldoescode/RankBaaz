/**
 * keeps the about page focused and readable.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
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

const getDisplayStats = (stats = []) => {
  if (!stats.length || stats.some((stat) => looksInflated(stat.value))) {
    return fallbackStats;
  }
  return stats.slice(0, 3);
};

const AboutImageSlot = () => {
  const [hasImage, setHasImage] = useState(true);

  if (!hasImage) {
    return (
      <div className="vg-about-image-fallback">
        <span>image</span>
      </div>
    );
  }

  return (
    <img
      src="/images/about-learning-workspace.webp"
      alt="Students and teachers reviewing course progress together"
      className="vg-about-image"
      loading="lazy"
      onError={() => setHasImage(false)}
    />
  );
};

const About = () => {
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, loading } = useContent();

  useSEO({
    title: "About Us",
    description: `Learn more about ${
      contentSettings?.siteName || "Vidhgrow"
    }, a course and test practice platform for clearer study progress.`,
    keywords: "about, vidhgrow, courses, practice tests, student progress",
    type: "website",
    canonicalUrl: `${contentSettings?.siteUrl || window.location.origin}/about`,
  });

  if (loading || !contentSettings) {
    return <Loading variant="page" />;
  }

  const siteName = contentSettings?.siteName || "Vidhgrow";
  const stats = getDisplayStats(contentSettings?.aboutStats || []);
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
        <section className="vg-about-hero">
          <motion.div {...motionProps} className="vg-about-copy">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              About {siteName}
            </p>
            <h1>
              A calmer place for courses, tests, and the next revision.
            </h1>
            <p>
              Vidhgrow is built for learners who want structure without noise:
              course material, timed practice, teacher context, and progress
              signals in one focused workspace.
            </p>

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
            className="vg-about-image-frame"
          >
            <AboutImageSlot />
          </motion.div>
        </section>

        <motion.section {...motionProps} className="vg-about-values">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
              What drives us
            </p>
            <h2>Useful tools for real study habits.</h2>
          </div>

          <div className="vg-about-value-list">
            {storyPoints.map((point) => (
              <article key={point.title}>
                <span>{point.title}</span>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section {...motionProps} className="vg-about-cta">
          <div>
            <h2>Start with one course. Keep the work visible.</h2>
            <p>
              Browse available courses or create an account to keep attempts,
              reports, and revision steps together.
            </p>
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
