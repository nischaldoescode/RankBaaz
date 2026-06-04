/**
 * keeps the home page focused and readable.
 */
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BookOpen,
  Award,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useContent } from "../context/ContentContext";
import Loading from "../components/common/Loading";

import TeacherCTASection from "../components/Teachers/TeacherCTA";

const Divider = () => (
  <div className="flex items-center justify-center py-2">
    <motion.div
      className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
      initial={{ width: 0 }}
      whileInView={{ width: "100%" }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    />
  </div>
);

const SectionLabel = ({ children }) => (
  <motion.p
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3"
  >
    {children}
  </motion.p>
);

const humanDefaultCopy = {
  heroTitle: "Learn clearly. Practice with purpose.",
  heroHighlight: "Keep progress visible",
  heroDescription:
    "Vidhgrow brings teacher-led courses, exam-style tests, and progress reports into one calm workspace, so every attempt points to the next useful step.",
  featuresTitle: "A quieter way to keep moving",
  featuresDescription:
    "Study material, test attempts, and progress signals sit close together without turning the page into noise.",
  ctaTitle: "Start small. Keep the work visible.",
  ctaDescription:
    "Create your free account and keep course progress, attempts, score reports, and next steps in one place.",
};

const oldDefaultCopy = {
  heroTitle: "Master Your Skills with",
  heroHighlight: "Advanced Testing",
  heroDescription:
    "Experience personalized learning. Track your progress, identify strengths, and achieve your goals faster than ever.",
  featuresTitle: "Why Choose Vidhgrow",
  featuresDescription:
    "Our platform combines cutting-edge technology with proven learning methodologies to deliver personalized experiences that accelerate your growth.",
  ctaTitle: "Ready to Transform Your Learning Journey?",
  ctaDescription:
    "Join thousands of learners accelerating their growth with personalized testing.",
};

const copyOrHumanDefault = (value, oldDefault, fallback) =>
  value && value !== oldDefault ? value : fallback;

const platformHighlights = [
  {
    title: "Course notes that stay usable",
    kicker: "Read",
    description:
      "Open a lesson, keep the teacher's context nearby, and revise from material that still feels usable after the first read.",
    imageSrc: "/images/home-course-notes.webp",
    imageName: "home-course-notes.webp",
  },
  {
    title: "Tests with real feedback",
    kicker: "Practice",
    description:
      "Take a timed attempt, review the weak spots, and understand what changed before moving to the next round.",
    imageSrc: "/images/home-practice-test.webp",
    imageName: "home-practice-test.webp",
  },
  {
    title: "Progress you can read",
    kicker: "Review",
    description:
      "See scores, rank movement, attempts, and course progress in a way that helps you decide what to do next.",
    imageSrc: "/images/home-progress-review.webp",
    imageName: "home-progress-review.webp",
  },
];

const isOldHeroCopy = (value, oldDefault, fallback) => {
  if (!value || value === oldDefault) return fallback;
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  if (
    normalized === "master your skills with vidhgrow" ||
    normalized === "with courses curated by professionals"
  ) {
    return fallback;
  }
  return value;
};

const StoryImageSlot = ({ item }) => {
  const [hasImage, setHasImage] = useState(true);

  if (!hasImage) {
    return (
      <div className="vg-story-image-fallback">
        <span>{item.imageName}</span>
        <p>Place the generated image in Frontend/public/images.</p>
      </div>
    );
  }

  return (
    <img
      src={item.imageSrc}
      alt={`${item.title} illustration`}
      className="vg-story-image"
      loading="lazy"
      onError={() => setHasImage(false)}
    />
  );
};

const StoryChapter = ({ item, index, animations, reducedMotion }) => {
  const chapterRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start end", "end start"],
  });
  const copyY = useTransform(scrollYProgress, [0, 0.5, 1], [34, 0, -22]);
  const imageY = useTransform(scrollYProgress, [0, 0.5, 1], [74, -8, -86]);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1.035, 0.98]);
  const imageRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-1.2, 0.4, 1.2]);
  const chapterOpacity = useTransform(scrollYProgress, [0, 0.14, 0.86, 1], [0.45, 1, 1, 0.42]);

  return (
    <motion.article
      ref={chapterRef}
      style={reducedMotion ? undefined : { opacity: chapterOpacity }}
      initial={animations && !reducedMotion ? { opacity: 0, y: 34 } : {}}
      whileInView={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      className={`vg-story-chapter vg-story-chapter-${index + 1}`}
    >
      <motion.div
        style={reducedMotion ? undefined : { y: copyY }}
        className="vg-story-chapter-copy"
      >
        <span className="vg-story-index">
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="vg-story-kicker">{item.kicker}</p>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </motion.div>

      <motion.div
        style={
          reducedMotion
            ? undefined
            : { y: imageY, scale: imageScale, rotate: imageRotate }
        }
        className="vg-story-image-frame"
      >
        <StoryImageSlot item={item} />
      </motion.div>
    </motion.article>
  );
};

const LearningStorySection = ({ animations, reducedMotion, isAuthenticated }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [-54, 0, 34]);
  const fade = useTransform(scrollYProgress, [0, 0.18, 0.78, 1], [0.4, 1, 1, 0.24]);

  const motionStyle = reducedMotion ? undefined : { x: textX, opacity: fade };

  return (
    <section
      ref={sectionRef}
      className="vg-story-horizontal relative px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          style={motionStyle}
          initial={animations && !reducedMotion ? { opacity: 0, y: 24 } : {}}
          whileInView={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl space-y-5 text-center"
        >
          <SectionLabel>How the work moves</SectionLabel>
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            A study rhythm that feels easy to return to.
          </h2>
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            Learn from the course, test the idea, then use the result to choose
            the next revision. The page stays quiet, but the work keeps moving.
          </p>
        </motion.div>

        <div className="mt-12 space-y-10" aria-label="Vidhgrow learning flow">
          {platformHighlights.map((item, index) => (
            <StoryChapter
              key={item.title}
              item={item}
              index={index}
              animations={animations}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gap-2 px-6">
            <Link to={isAuthenticated ? "/courses" : "/register"}>
              {isAuthenticated ? "Open courses" : "Start practicing"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const refinedFeatureCopy = {
  "Smart Learning": {
    title: "Guided study paths",
    description:
      "Move through courses and practice sets in an order that makes sense for your current level.",
  },
  "Precision Testing": {
    title: "Exam-style practice",
    description:
      "Use focused assessments to see what is strong, what needs work, and what to revise next.",
  },
  "Achievement System": {
    title: "Visible progress",
    description:
      "Track scores, attempts, and course movement with clear feedback and less clutter.",
  },
};

const refineFeature = (feature) => ({
  ...feature,
  ...(refinedFeatureCopy[feature.title] || {}),
});

const Home = () => {
  const [email, setEmail] = useState("");
  const [activeStatIndex, setActiveStatIndex] = useState(null);
  const { isAuthenticated } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, faqs, fetchFAQs, loading } = useContent();
  const pageRef = useRef(null);
  const { scrollYProgress: pageScrollProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });
  const pageDriftY = useTransform(pageScrollProgress, [0, 1], [-24, 42]);
  const pageDriftX = useTransform(pageScrollProgress, [0, 1], [18, -36]);
  const pageArtifactStyle = reducedMotion
    ? undefined
    : { y: pageDriftY, x: pageDriftX };

  useSEO({
    title:
      contentSettings?.seoTitle || "Prepare with Precision",
    description:
      contentSettings?.seoDescription ||
      "Master your skills with Vidhgrow's interactive courses, personalized assessments, and real-time progress tracking.",
    keywords:
      "vidhgrow, online learning, test preparation, courses, exams, practice tests",
    type: "website",
    canonicalUrl: `${contentSettings?.siteUrl || window.location.origin}/`,
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const chartData =
    contentSettings?.stats?.map((stat) => ({
      name: stat.label,
      value: parseInt(stat.value.replace(/[^0-9]/g, "")) || 0,
      displayValue: stat.value,
    })) || [];

  const heroTitle = isOldHeroCopy(
    contentSettings?.heroTitle,
    oldDefaultCopy.heroTitle,
    humanDefaultCopy.heroTitle,
  );
  const heroHighlight = isOldHeroCopy(
    contentSettings?.heroHighlight,
    oldDefaultCopy.heroHighlight,
    humanDefaultCopy.heroHighlight,
  );
  const heroDescription = copyOrHumanDefault(
    contentSettings?.heroDescription,
    oldDefaultCopy.heroDescription,
    humanDefaultCopy.heroDescription,
  );
  const featuresTitle = copyOrHumanDefault(
    contentSettings?.featuresTitle,
    oldDefaultCopy.featuresTitle,
    humanDefaultCopy.featuresTitle,
  );
  const featuresDescription = copyOrHumanDefault(
    contentSettings?.featuresDescription,
    oldDefaultCopy.featuresDescription,
    humanDefaultCopy.featuresDescription,
  );
  const ctaTitle = copyOrHumanDefault(
    contentSettings?.ctaTitle,
    oldDefaultCopy.ctaTitle,
    humanDefaultCopy.ctaTitle,
  );
  const ctaDescription = copyOrHumanDefault(
    contentSettings?.ctaDescription,
    oldDefaultCopy.ctaDescription,
    humanDefaultCopy.ctaDescription,
  );

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setEmail("");
  };

  const renderChart = () => {
    const chartConfig = contentSettings?.chartConfig;
    if (!chartConfig?.enabled || chartData.length === 0) return null;
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

    switch (chartConfig.type) {
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case "doughnut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (loading && !contentSettings) {
    return <Loading variant="page" />;
  }

  return (
    <div ref={pageRef} className="relative overflow-x-hidden">
      <motion.div
        aria-hidden="true"
        className="vg-home-page-parallax vg-home-page-parallax-a"
        style={pageArtifactStyle}
      />
      <motion.div
        aria-hidden="true"
        className="vg-home-page-parallax vg-home-page-parallax-b"
        style={reducedMotion ? undefined : { y: pageDriftY }}
      />
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 lg:px-8">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
      linear-gradient(hsl(var(--foreground)/0.04) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--foreground)/0.04) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0",
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 30 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            transition={animations && !reducedMotion ? { duration: 0.7 } : {}}
            className="mx-auto max-w-4xl space-y-7 text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-tight">
              {heroTitle}
              <br />
              <span className="vg-raw-highlight">
                {heroHighlight}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {heroDescription}
            </p>

            {isAuthenticated ? (
              <motion.div
                initial={
                  animations && !reducedMotion ? { opacity: 0, y: 16 } : {}
                }
                animate={
                  animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                }
                transition={animations && !reducedMotion ? { delay: 0.5 } : {}}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <Button asChild size="lg" className="gap-2 px-6">
                  <Link to="/courses">
                    <BookOpen className="w-4 h-4" />
                    Explore Courses
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="gap-2 px-6"
                >
                  <Link to="/courses">
                    <Award className="w-4 h-4" />
                    Take a Test
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={
                  animations && !reducedMotion ? { opacity: 0, y: 16 } : {}
                }
                animate={
                  animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                }
                transition={animations && !reducedMotion ? { delay: 0.5 } : {}}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <Button asChild size="lg" className="gap-2 px-6">
                  <Link to="/register">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-6">
                  <Link to="/login">Sign In</Link>
                </Button>
              </motion.div>
            )}

            {contentSettings?.stats && contentSettings.stats.length > 0 && (
              <motion.p
                initial={animations && !reducedMotion ? { opacity: 0 } : {}}
                animate={animations && !reducedMotion ? { opacity: 1 } : {}}
                transition={{ delay: 0.9 }}
                className="text-xs tracking-wide text-muted-foreground/70"
              >
                Courses, tests, reports, and rank tracking for{" "}
                <span className="text-foreground font-medium">
                  {contentSettings.stats[0]?.value || "thousands"}
                </span>{" "}
                learners
              </motion.p>
            )}
          </motion.div>

        </div>
      </section>

      <LearningStorySection
        animations={animations}
        reducedMotion={reducedMotion}
        isAuthenticated={isAuthenticated}
      />

      <Divider />

      {contentSettings?.stats && contentSettings.stats.length > 0 && (
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel>By the numbers</SectionLabel>
            </div>

            <div
              className={`grid gap-12 items-center ${
                contentSettings?.chartConfig?.enabled
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {contentSettings?.chartConfig?.enabled &&
                contentSettings?.chartConfig?.position === "left" && (
                  <motion.div
                    initial={
                      animations && !reducedMotion
                        ? { opacity: 0, scale: 0.9 }
                        : {}
                    }
                    whileInView={
                      animations && !reducedMotion
                        ? { opacity: 1, scale: 1 }
                        : {}
                    }
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="h-72 order-1"
                  >
                    {renderChart()}
                  </motion.div>
                )}

              <div
                className={`grid grid-cols-2 gap-5 ${
                  contentSettings?.chartConfig?.enabled &&
                  contentSettings?.chartConfig?.position === "left"
                    ? "order-2"
                    : "order-1 lg:max-w-xl mx-auto w-full"
                }`}
              >
                {contentSettings.stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={
                      animations && !reducedMotion
                        ? { opacity: 0, y: 20 }
                        : {}
                    }
                    whileInView={
                      animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                    }
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    onHoverStart={() => setActiveStatIndex(index)}
                    onHoverEnd={() => setActiveStatIndex(null)}
                    className="group relative cursor-default rounded-lg border border-border/50 bg-background/70 p-5 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground">
                        {stat.value}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {stat.label}
                      </div>
                    </div>
                    {activeStatIndex === index && (
                      <motion.div
                        layoutId="stat-glow"
                        className="absolute inset-0 -z-10 rounded-lg bg-primary/5"
                        transition={{ type: "spring", bounce: 0.2 }}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {contentSettings?.chartConfig?.enabled &&
                contentSettings?.chartConfig?.position === "right" && (
                  <motion.div
                    initial={
                      animations && !reducedMotion
                        ? { opacity: 0, scale: 0.9 }
                        : {}
                    }
                    whileInView={
                      animations && !reducedMotion
                        ? { opacity: 1, scale: 1 }
                        : {}
                    }
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="h-72 order-2"
                  >
                    {renderChart()}
                  </motion.div>
                )}
            </div>
          </div>
        </section>
      )}

      <Divider />

      {contentSettings?.features && contentSettings.features.length > 0 && (
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={
                animations && !reducedMotion ? { opacity: 0, y: 24 } : {}
              }
              whileInView={
                animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
              }
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <SectionLabel>Why us</SectionLabel>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                {featuresTitle}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {featuresDescription}
              </p>
            </motion.div>

            <div className="vg-feature-river">
              {contentSettings.features.map((rawFeature, index) => {
                const feature = refineFeature(rawFeature);
                return (
                  <motion.div
                    key={index}
                    initial={
                      animations && !reducedMotion ? { opacity: 0, y: 20 } : {}
                    }
                    whileInView={
                      animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                    }
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.12 }}
                    whileHover={animations && !reducedMotion ? { x: 6 } : {}}
                    className="vg-feature-river-item"
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Divider />

      {/* call to action */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto text-center relative">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            whileInView={
              animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
            }
            viewport={{ once: true }}
            className="space-y-6"
          >
            <SectionLabel>Get started</SectionLabel>
            <h2 className="text-3xl lg:text-4xl font-bold">
              {ctaTitle}
            </h2>
            <p className="text-lg text-muted-foreground">
              {ctaDescription}
            </p>

            <form
              onSubmit={handleEmailSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-11"
              />
              <Button
                type="submit"
                className="h-11 px-6 gap-2 whitespace-nowrap"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-xs text-muted-foreground/60">
              Start learning today.
            </p>
          </motion.div>
        </div>
      </section>

      <Divider />

      <TeacherCTASection />

      {/* faq */}
      {faqs && faqs.length > 0 && (
        <section
          id="faqs"
          className="relative py-20 px-4 sm:px-6 lg:px-8 bg-muted/20"
        >
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={
                animations && !reducedMotion ? { opacity: 0, y: 24 } : {}
              }
              whileInView={
                animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
              }
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <SectionLabel>Questions</SectionLabel>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3">
                Frequently Asked <span className="text-primary">Questions</span>
              </h2>
              <p className="text-muted-foreground">
                Get answers to common questions about our platform.
              </p>
            </motion.div>

            <motion.div
              initial={
                animations && !reducedMotion ? { opacity: 0, y: 16 } : {}
              }
              whileInView={
                animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
              }
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
            >
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.slice(0, 5).map((faq, index) => (
                  <AccordionItem
                    key={faq._id || index}
                    value={`item-${index}`}
                    className="border border-border/60 hover:border-primary/40 rounded-xl px-5 bg-background/60 backdrop-blur-sm transition-colors duration-200"
                  >
                    <AccordionTrigger className="text-left hover:no-underline font-medium text-foreground py-4 text-sm sm:text-base">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-4 text-sm sm:text-base">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
