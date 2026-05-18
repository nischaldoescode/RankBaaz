import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  ArrowRight,
  Target,
  Trophy,
  Rocket,
  Zap,
  Shield,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
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

const iconMap = {
  Brain,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Target,
  Trophy,
  Rocket,
  Zap,
  Shield,
  Lightbulb,
};

import TeacherCTASection from "../components/Teachers/TeacherCTA";

const Badge = ({ children }) => (
  <motion.span
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
  >
    <Target className="h-3 w-3" />
    {children}
  </motion.span>
);

// thin animated divider
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

// section label pill
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
  heroTitle: "Practice smarter with",
  heroHighlight: "courses, tests, and clear feedback",
  heroDescription:
    "Vidhgrow brings course learning, timed practice tests, score reports, and leaderboards into one simple place, so students can see what to study next.",
  featuresTitle: "Built for focused practice",
  featuresDescription:
    "Choose a course, attempt a test, review your result, and keep improving with progress that is easy to understand.",
  ctaTitle: "Start with a course, then test yourself",
  ctaDescription:
    "Create your free account and keep your practice history, results, badges, and course progress together.",
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
    icon: BookOpen,
    title: "Learn from courses",
    description: "Organized lessons and teacher-created material.",
  },
  {
    icon: Target,
    title: "Practice with tests",
    description: "Timed attempts with question-level feedback.",
  },
  {
    icon: Trophy,
    title: "Track your rank",
    description: "Progress, badges, and leaderboard movement.",
  },
];

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
      {/* ── Hero ── */}
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 lg:px-8">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
      linear-gradient(hsl(var(--foreground)/0.04) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--foreground)/0.04) 1px, transparent 1px)
    `,
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0" /* anchored to top-left — no gap */,
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 30 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            transition={animations && !reducedMotion ? { duration: 0.7 } : {}}
            className="mx-auto max-w-4xl space-y-7 text-center"
          >
            <Badge>Built around real practice, not noise</Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight leading-tight">
              {heroTitle}
              <br />
              <span className="relative inline-block text-primary">
                {heroHighlight}
                <motion.span
                  className="absolute -bottom-1 left-0 h-[3px] rounded-full bg-primary/30"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.6, duration: 0.7, ease: "easeOut" }}
                />
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
                    <Rocket className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-6">
                  <Link to="/login">Sign In</Link>
                </Button>
              </motion.div>
            )}

            {/* minimal trust line */}
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

          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 18 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            transition={animations && !reducedMotion ? { delay: 0.7 } : {}}
            className="mt-12 grid gap-3 sm:grid-cols-3"
          >
            {platformHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-lg border border-border/70 bg-background/75 p-4 shadow-sm backdrop-blur-sm"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* ── Stats ── */}
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
              {/* chart left */}
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

              {/* stats grid */}
              <div
                className={`grid grid-cols-2 gap-5 ${
                  contentSettings?.chartConfig?.enabled &&
                  contentSettings?.chartConfig?.position === "left"
                    ? "order-2"
                    : "order-1 lg:max-w-xl mx-auto w-full"
                }`}
              >
                {contentSettings.stats.map((stat, index) => {
                  const IconComponent = iconMap[stat.icon] || Users;
                  return (
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-foreground">
                          {stat.value}
                        </div>
                        <div className="text-xs text-muted-foreground leading-tight">
                          {stat.label}
                        </div>
                      </div>
                      {/* hover glow */}
                      {activeStatIndex === index && (
                        <motion.div
                          layoutId="stat-glow"
                          className="absolute inset-0 -z-10 rounded-lg bg-primary/5"
                          transition={{ type: "spring", bounce: 0.2 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* chart right */}
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

      {/* ── Features ── */}
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

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {contentSettings.features.map((feature, index) => {
                const IconComponent = iconMap[feature.icon] || Brain;
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
                    whileHover={animations && !reducedMotion ? { y: -4 } : {}}
                  >
                    <Card className="h-full rounded-lg border-border/50 bg-background/70 backdrop-blur-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                          <IconComponent className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold mb-2 text-foreground">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Divider />

      {/* ── CTA ── */}
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

      {/* ── FAQ ── */}
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
