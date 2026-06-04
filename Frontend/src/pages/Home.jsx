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
  heroTitle: "Learn the next thing clearly",
  heroHighlight: "then practice until it stays",
  heroDescription:
    "Vidhgrow keeps courses, tests, teacher notes, and progress reports in one calm workspace, so every attempt tells you what to revise next.",
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
    description: "Lessons, files, and teacher context kept close to the work.",
  },
  {
    title: "Tests with real feedback",
    description: "Timed attempts, answer checks, and review points after each run.",
  },
  {
    title: "Progress you can read",
    description: "Scores, rank movement, and attempts shown without extra decoration.",
  },
];

const LearningFlowIllustration = ({ animations, reducedMotion }) => (
  <svg
    className="vg-learning-illustration"
    viewBox="0 0 680 520"
    role="img"
    aria-label="Learning path from course notes to practice test and progress review"
  >
    <defs>
      <linearGradient id="storyBlue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.92" />
        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.72" />
      </linearGradient>
      <linearGradient id="storySoft" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#eff6ff" />
        <stop offset="100%" stopColor="#ffffff" />
      </linearGradient>
      <filter id="storyShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow
          dx="0"
          dy="18"
          stdDeviation="18"
          floodColor="#1e3a8a"
          floodOpacity="0.13"
        />
      </filter>
    </defs>

    <motion.g
      className="vg-illustration-grid"
      animate={
        animations && !reducedMotion
          ? { x: [0, 12, 0], y: [0, -8, 0] }
          : {}
      }
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M64 116h540M64 196h540M64 276h540M64 356h540" />
      <path d="M138 70v360M258 70v360M378 70v360M498 70v360" />
    </motion.g>

    <motion.g
      filter="url(#storyShadow)"
      animate={
        animations && !reducedMotion
          ? { y: [0, -10, 0], rotate: [0, -1.2, 0] }
          : {}
      }
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="90" y="116" width="214" height="156" rx="18" fill="url(#storySoft)" />
      <path d="M124 154h92M124 184h148M124 214h118" className="vg-svg-line" />
      <path
        d="M256 138c18 18 18 50 0 68-18-18-18-50 0-68Z"
        fill="#dbeafe"
      />
      <path
        d="M255 154v42M240 174h30"
        stroke="#2563eb"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </motion.g>

    <motion.g
      filter="url(#storyShadow)"
      animate={
        animations && !reducedMotion
          ? { y: [0, 12, 0], rotate: [0, 1.4, 0] }
          : {}
      }
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
    >
      <rect x="382" y="170" width="214" height="160" rx="18" fill="#ffffff" />
      <rect x="414" y="206" width="150" height="18" rx="9" fill="#dbeafe" />
      <rect x="414" y="244" width="108" height="14" rx="7" fill="#bfdbfe" />
      <rect x="414" y="276" width="132" height="14" rx="7" fill="#e0f2fe" />
      <circle cx="556" cy="278" r="24" fill="url(#storyBlue)" />
      <path
        d="M546 278l8 8 18-22"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>

    <motion.g
      animate={
        animations && !reducedMotion
          ? { pathLength: [0.25, 1, 0.25] }
          : {}
      }
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M296 218C350 186 380 198 414 226"
        fill="none"
        stroke="url(#storyBlue)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="12 16"
      />
    </motion.g>

    <motion.g
      filter="url(#storyShadow)"
      animate={
        animations && !reducedMotion
          ? { y: [0, -16, 0], x: [0, 8, 0] }
          : {}
      }
      transition={{ duration: 6.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    >
      <rect x="206" y="332" width="260" height="88" rx="18" fill="#ffffff" />
      <path d="M242 382h210" stroke="#dbeafe" strokeWidth="12" strokeLinecap="round" />
      <path d="M242 382h132" stroke="url(#storyBlue)" strokeWidth="12" strokeLinecap="round" />
      <circle cx="242" cy="382" r="18" fill="#2563eb" />
      <circle cx="374" cy="382" r="18" fill="#38bdf8" />
      <circle cx="452" cy="382" r="18" fill="#dbeafe" />
    </motion.g>

    <motion.g
      className="vg-illustration-orbits"
      animate={
        animations && !reducedMotion
          ? { rotate: [0, 4, -4, 0] }
          : {}
      }
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="120" cy="360" r="28" />
      <circle cx="568" cy="122" r="36" />
      <path d="M544 122h72M568 86v72" />
    </motion.g>
  </svg>
);

const LearningStorySection = ({ animations, reducedMotion, isAuthenticated }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const textX = useTransform(scrollYProgress, [0, 0.5, 1], [-38, 0, 28]);
  const artX = useTransform(scrollYProgress, [0, 0.5, 1], [56, 0, -42]);
  const artY = useTransform(scrollYProgress, [0, 0.5, 1], [26, -12, -42]);
  const fade = useTransform(scrollYProgress, [0, 0.18, 0.78, 1], [0.4, 1, 1, 0.24]);

  const motionStyle = reducedMotion ? undefined : { x: textX, opacity: fade };
  const artStyle = reducedMotion ? undefined : { x: artX, y: artY, opacity: fade };

  return (
    <section
      ref={sectionRef}
      className="vg-story-horizontal relative px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          style={motionStyle}
          initial={animations && !reducedMotion ? { opacity: 0, y: 24 } : {}}
          whileInView={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
          viewport={{ once: true, margin: "-80px" }}
          className="space-y-6"
        >
          <SectionLabel>How the work moves</SectionLabel>
          <h2 className="max-w-xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Read the lesson, try the test, keep the next step visible.
          </h2>
          <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            Vidhgrow is built around the actual study loop: course material,
            timed attempts, feedback, and a cleaner view of what changed after
            every round.
          </p>

          <div className="vg-story-rail" aria-label="Vidhgrow learning flow">
            {platformHighlights.map((item, index) => (
              <div className="vg-story-point" key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="gap-2 px-6">
            <Link to={isAuthenticated ? "/courses" : "/register"}>
              {isAuthenticated ? "Open courses" : "Start the loop"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          style={artStyle}
          initial={animations && !reducedMotion ? { opacity: 0, scale: 0.96 } : {}}
          whileInView={animations && !reducedMotion ? { opacity: 1, scale: 1 } : {}}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="vg-story-illustration-card"
        >
          <LearningFlowIllustration
            animations={animations}
            reducedMotion={reducedMotion}
          />
        </motion.div>
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

  const heroTitle = copyOrHumanDefault(
    contentSettings?.heroTitle,
    oldDefaultCopy.heroTitle,
    humanDefaultCopy.heroTitle,
  );
  const heroHighlight = copyOrHumanDefault(
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
    <div className="overflow-x-hidden">
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
