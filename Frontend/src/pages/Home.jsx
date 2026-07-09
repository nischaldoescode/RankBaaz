/**
 * renders the public home page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/home.jsx
 * @module frontend/src/pages/home
 * @exports route component rendered by the client router
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { animate, createTimeline, stagger } from "animejs";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
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
import { validateStudentEmail } from "../utils/emailValidation";

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

/**
 * runs an anime.js timeline once when an element becomes visible
 *
 * @param {object} targetRef react ref that points to the animated root element
 * @param {boolean} enabled whether animations can run for the current user settings
 * @param {Function} createAnimation callback that receives the root and returns anime instances
 * @returns {void}
 */
const useAnimeOnView = (targetRef, enabled, createAnimation) => {
  useEffect(() => {
    const root = targetRef.current;
    if (!enabled || !root || typeof window === "undefined") return undefined;

    let hasPlayed = false;
    let animeInstances = [];

    const play = () => {
      if (hasPlayed) return;
      hasPlayed = true;
      animeInstances = [createAnimation(root)].flat().filter(Boolean);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          play();
          observer.disconnect();
        }
      },
      { threshold: 0.34, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(root);

    return () => {
      observer.disconnect();
      animeInstances.forEach((instance) => {
        if (instance?.revert) instance.revert();
        else if (instance?.cancel) instance.cancel();
      });
    };
  }, [targetRef, enabled, createAnimation]);
};

/**
 * watches one viewport query so scroll animations can be tuned by screen size
 *
 * @param {string} query css media query to observe
 * @returns {boolean} true when the viewport matches the query
 */
const useMediaQuery = (query) => {
  const getMatches = () =>
    typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener?.("change", updateMatches);
    mediaQuery.addListener?.(updateMatches);

    return () => {
      mediaQuery.removeEventListener?.("change", updateMatches);
      mediaQuery.removeListener?.(updateMatches);
    };
  }, [query]);

  return matches;
};

const animeChars = (value) =>
  Array.from(String(value || "")).map((char, index) => (
    <span
      aria-hidden="true"
      className="vg-anime-brush-letter"
      key={`${char}-${index}`}
    >
      {char === " " ? "\u00a0" : char}
    </span>
  ));

const AnimeBrushHighlight = ({ children, className = "", enabled }) => {
  const rootRef = useRef(null);
  const text = String(children || "");

  useAnimeOnView(rootRef, enabled, (root) => {
    const stroke = root.querySelector(".vg-anime-brush-stroke");
    const underline = root.querySelector(".vg-anime-brush-underline");
    const letters = root.querySelectorAll(".vg-anime-brush-letter");

    return createTimeline({
      defaults: { ease: "out(3)" },
    })
      .add(stroke, {
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 760,
      })
      .add(underline, {
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 520,
      }, 170)
      .add(letters, {
        opacity: [0.68, 1],
        translateY: [8, 0],
        duration: 520,
        delay: stagger(16),
      }, 90);
  });

  return (
    <span
      ref={rootRef}
      className={`vg-anime-brush-word ${enabled ? "vg-anime-enabled" : ""} ${className}`}
      aria-label={text}
    >
      <span aria-hidden="true" className="vg-anime-brush-stroke" />
      <span aria-hidden="true" className="vg-anime-brush-underline" />
      <span aria-hidden="true" className="vg-anime-brush-text">
        {animeChars(text)}
      </span>
    </span>
  );
};

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
  const imageSrc =
    item.image?.url || item.imageSrc || item.image?.fallbackSrc || "";
  const imageAlt =
    item.image?.alt || `${item.title || "Vidhgrow study flow"} illustration`;

  if (!imageSrc || !hasImage) {
    return (
      <div className="vg-story-image-fallback">
        <span>{item.imageName}</span>
        <p>Place the generated image in Frontend/public/images.</p>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      className="vg-story-image"
      loading="lazy"
      onError={() => setHasImage(false)}
    />
  );
};

const HomeParallaxStage = ({
  scrollProgress,
  reducedMotion,
  isSmallViewport,
}) => {
  const farY = useTransform(scrollProgress, [0, 1], [-160, 260]);
  const midY = useTransform(scrollProgress, [0, 1], [120, -280]);
  const nearY = useTransform(scrollProgress, [0, 1], [240, -520]);
  const nearX = useTransform(scrollProgress, [0, 1], [-80, 90]);
  const reverseX = useTransform(scrollProgress, [0, 1], [86, -110]);
  const mobileFarY = useTransform(scrollProgress, [0, 1], [-70, 140]);
  const mobileMidY = useTransform(scrollProgress, [0, 1], [58, -150]);
  const mobileNearY = useTransform(scrollProgress, [0, 1], [92, -220]);
  const mobileNearX = useTransform(scrollProgress, [0, 1], [-14, 14]);
  const mobileReverseX = useTransform(scrollProgress, [0, 1], [14, -14]);
  const lineDraw = useTransform(scrollProgress, [0.02, 0.82], [0, 1]);
  const lineOpacity = useTransform(scrollProgress, [0, 0.12, 0.9, 1], [0.25, 0.72, 0.58, 0.2]);
  const brushScale = useTransform(scrollProgress, [0, 0.28, 0.62, 1], [0.9, 1.08, 0.98, 1.06]);

  const activeStyle = (style) => (reducedMotion ? undefined : style);
  const farLayerY = isSmallViewport ? mobileFarY : farY;
  const midLayerY = isSmallViewport ? mobileMidY : midY;
  const nearLayerY = isSmallViewport ? mobileNearY : nearY;
  const nearLayerX = isSmallViewport ? mobileNearX : nearX;
  const reverseLayerX = isSmallViewport ? mobileReverseX : reverseX;

  return (
    <div className="vg-home-parallax-stage" aria-hidden="true">
      <motion.svg
        className="vg-home-story-lines"
        viewBox="0 0 1200 3600"
        preserveAspectRatio="none"
        style={activeStyle({ y: farLayerY, opacity: lineOpacity })}
      >
        <motion.path
          className="vg-home-story-line vg-home-story-line-main"
          d="M642 70 C422 320 872 560 518 840 C210 1084 986 1180 632 1510 C244 1862 932 1976 534 2350 C274 2594 858 2806 652 3560"
          fill="none"
          style={activeStyle({ pathLength: lineDraw })}
        />
        <motion.path
          className="vg-home-story-line vg-home-story-line-soft"
          d="M304 220 C796 420 196 742 746 1004 C1110 1178 270 1554 792 1844 C1034 1980 382 2344 906 2600 C1130 2710 646 3100 892 3480"
          fill="none"
          style={activeStyle({ pathLength: lineDraw })}
        />
      </motion.svg>

      <motion.div
        className="vg-parallax-depth vg-parallax-depth-far vg-depth-grid vg-depth-grid-a"
        style={activeStyle({ y: farLayerY, x: reverseLayerX })}
      />
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-mid vg-depth-sheet vg-depth-sheet-a"
        style={activeStyle({ y: midLayerY, x: nearLayerX })}
      />
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-near vg-depth-brush vg-depth-brush-a"
        style={activeStyle({ y: nearLayerY, scale: brushScale })}
      />
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-mid vg-depth-ring vg-depth-ring-a"
        style={activeStyle({ y: midLayerY, x: reverseLayerX })}
      />
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-near vg-depth-note vg-depth-note-a"
        style={activeStyle({ y: nearLayerY, x: nearLayerX })}
      >
        read
      </motion.div>
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-far vg-depth-note vg-depth-note-b"
        style={activeStyle({ y: farLayerY, x: reverseLayerX })}
      >
        test
      </motion.div>
      <motion.div
        className="vg-parallax-depth vg-parallax-depth-mid vg-depth-note vg-depth-note-c"
        style={activeStyle({ y: midLayerY, x: nearLayerX })}
      >
        review
      </motion.div>
    </div>
  );
};

const StoryChapter = ({
  item,
  index,
  animations,
  reducedMotion,
  isSmallViewport,
}) => {
  const chapterRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: chapterRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 24,
    mass: 0.42,
  });
  const copyY = useTransform(smoothProgress, [0, 0.5, 1], [96, 0, -76]);
  const imageY = useTransform(smoothProgress, [0, 0.5, 1], [190, -24, -230]);
  const imageX = useTransform(smoothProgress, [0, 0.5, 1], [34, 0, -42]);
  const imageScale = useTransform(smoothProgress, [0, 0.5, 1], [0.9, 1.07, 0.94]);
  const imageRotate = useTransform(smoothProgress, [0, 0.5, 1], [-3, 0.8, 2.4]);
  const mobileCopyY = useTransform(smoothProgress, [0, 0.5, 1], [34, 0, -26]);
  const mobileImageY = useTransform(smoothProgress, [0, 0.5, 1], [48, -8, -50]);
  const mobileImageScale = useTransform(smoothProgress, [0, 0.5, 1], [0.98, 1.015, 0.99]);
  const mobileImageRotate = useTransform(smoothProgress, [0, 0.5, 1], [-0.8, 0.25, 0.7]);
  const chapterOpacity = useTransform(smoothProgress, [0, 0.14, 0.86, 1], [0.25, 1, 1, 0.28]);
  const ruleScale = useTransform(smoothProgress, [0.08, 0.72], [0, 1]);
  const activeCopyY = isSmallViewport ? mobileCopyY : copyY;
  const activeImageY = isSmallViewport ? mobileImageY : imageY;
  const activeImageScale = isSmallViewport ? mobileImageScale : imageScale;
  const activeImageRotate = isSmallViewport ? mobileImageRotate : imageRotate;

  useAnimeOnView(chapterRef, animations && !reducedMotion, (root) => {
    const ink = root.querySelector(".vg-anime-chapter-ink");
    const copyParts = root.querySelectorAll(
      ".vg-story-index, .vg-story-kicker, .vg-story-chapter-copy h3, .vg-story-chapter-copy p",
    );

    return [
      animate(ink, {
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 820,
        ease: "out(3)",
      }),
      animate(copyParts, {
        opacity: [0.72, 1],
        translateY: [12, 0],
        duration: 620,
        delay: stagger(58),
        ease: "out(3)",
      }),
    ];
  });

  return (
    <motion.article
      ref={chapterRef}
      style={reducedMotion ? undefined : { opacity: chapterOpacity }}
      initial={animations && !reducedMotion ? { y: 34 } : {}}
      whileInView={animations && !reducedMotion ? { y: 0 } : {}}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.08 }}
      className={`vg-story-chapter vg-story-chapter-${index + 1}`}
    >
      <span className="vg-anime-chapter-ink" aria-hidden="true" />
      <motion.span
        className="vg-story-section-rule"
        style={reducedMotion ? undefined : { scaleX: ruleScale }}
      />
      <motion.div
        style={reducedMotion ? undefined : { y: activeCopyY }}
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
            : {
                y: activeImageY,
                x: isSmallViewport ? 0 : imageX,
                scale: activeImageScale,
                rotate: activeImageRotate,
              }
        }
        className="vg-story-image-frame"
      >
        <StoryImageSlot item={item} />
      </motion.div>
    </motion.article>
  );
};

const LearningStorySection = ({
  animations,
  reducedMotion,
  isAuthenticated,
  story,
}) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 68,
    damping: 26,
    mass: 0.48,
  });
  const textX = useTransform(smoothProgress, [0, 0.5, 1], [-54, 0, 34]);
  const fade = useTransform(smoothProgress, [0, 0.18, 0.78, 1], [0.4, 1, 1, 0.24]);
  const connectorY = useTransform(smoothProgress, [0, 1], [110, -180]);
  const connectorDraw = useTransform(smoothProgress, [0.06, 0.86], [0, 1]);
  const markerY = useTransform(smoothProgress, [0, 1], [70, -80]);
  const isSmallViewport = useMediaQuery("(max-width: 820px)");

  const motionStyle = reducedMotion
    ? undefined
    : { x: isSmallViewport ? 0 : textX, opacity: fade };

  return (
    <section
      ref={sectionRef}
      className="vg-story-horizontal relative px-4 py-16 sm:px-6 lg:px-8"
    >
      <motion.svg
        aria-hidden="true"
        className="vg-story-connector"
        viewBox="0 0 1200 1800"
        preserveAspectRatio="none"
        style={reducedMotion ? undefined : { y: connectorY }}
      >
        <motion.path
          className="vg-story-connector-path"
          d="M230 130 C650 250 260 430 720 610 C1040 735 390 930 760 1110 C1080 1264 420 1420 632 1700"
          fill="none"
          style={reducedMotion ? undefined : { pathLength: connectorDraw }}
        />
      </motion.svg>
      <motion.span
        className="vg-story-scroll-marker vg-story-scroll-marker-a"
        style={reducedMotion ? undefined : { y: markerY }}
      />
      <motion.span
        className="vg-story-scroll-marker vg-story-scroll-marker-b"
        style={reducedMotion ? undefined : { y: connectorY }}
      />
      <div className="mx-auto max-w-6xl">
        <motion.div
          style={motionStyle}
          initial={animations && !reducedMotion ? { y: 24 } : {}}
          whileInView={animations && !reducedMotion ? { y: 0 } : {}}
          viewport={{ once: true, margin: "-80px" }}
          className="vg-story-heading mx-auto max-w-3xl space-y-5 text-center"
        >
          <SectionLabel>{story.eyebrow}</SectionLabel>
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {renderBrushedTitle(story.title, story.highlightedText, {
              enabled: animations && !reducedMotion,
            })}
          </h2>
          <p className="text-base leading-8 text-muted-foreground sm:text-lg">
            {story.description}
          </p>
        </motion.div>

        <div className="mt-12 space-y-10" aria-label="Vidhgrow learning flow">
          {story.chapters.map((item, index) => (
            <StoryChapter
              key={item.title}
              item={item}
              index={index}
              animations={animations}
              reducedMotion={reducedMotion}
              isSmallViewport={isSmallViewport}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="gap-2 px-6">
            <Link to={isAuthenticated ? "/courses" : "/register"}>
              {isAuthenticated ? "Test Yourself" : "Start Practicing"}
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

const normalizeStoryChapters = (chapters) => {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return platformHighlights;
  }

  return chapters.map((chapter, index) => ({
    ...platformHighlights[index],
    ...chapter,
    image: {
      ...(platformHighlights[index]?.image || {}),
      ...(chapter.image || {}),
    },
    imageSrc:
      chapter.image?.url ||
      chapter.image?.fallbackSrc ||
      platformHighlights[index]?.imageSrc,
    imageName:
      chapter.imageName ||
      platformHighlights[index]?.imageName ||
      `story-image-${index + 1}.webp`,
  }));
};

const renderBrushedTitle = (title, highlightedText, animationProps = {}) => {
  if (!title || !highlightedText) return title;

  const normalizedTitle = title.toLowerCase();
  const normalizedHighlight = highlightedText.toLowerCase();
  const index = normalizedTitle.indexOf(normalizedHighlight);

  if (index === -1) {
    return (
      <>
        <AnimeBrushHighlight
          className="vg-story-brushed-word"
          enabled={animationProps.enabled}
        >
          {highlightedText}
        </AnimeBrushHighlight>{" "}
        {title}
      </>
    );
  }

  return (
    <>
      {title.slice(0, index)}
      <AnimeBrushHighlight
        className="vg-story-brushed-word"
        enabled={animationProps.enabled}
      >
        {title.slice(index, index + highlightedText.length)}
      </AnimeBrushHighlight>
      {title.slice(index + highlightedText.length)}
    </>
  );
};

const Home = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [activeStatIndex, setActiveStatIndex] = useState(null);
  const { isAuthenticated } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, faqs, fetchFAQs, loading } = useContent();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const isSmallViewport = useMediaQuery("(max-width: 820px)");
  const { scrollYProgress: pageScrollProgress } = useScroll({
    target: pageRef,
    offset: ["start start", "end end"],
  });
  const smoothPageProgress = useSpring(pageScrollProgress, {
    stiffness: 64,
    damping: 28,
    mass: 0.5,
  });
  const pageDriftY = useTransform(smoothPageProgress, [0, 1], [-24, 42]);
  const pageDriftX = useTransform(smoothPageProgress, [0, 1], [18, -36]);
  const mobilePageDriftX = useTransform(smoothPageProgress, [0, 1], [0, 0]);
  const heroY = useTransform(smoothPageProgress, [0, 0.2], [0, -80]);
  const mobileHeroY = useTransform(smoothPageProgress, [0, 0.2], [0, -34]);
  const heroScale = useTransform(smoothPageProgress, [0, 0.2], [1, 0.96]);
  const mobileHeroScale = useTransform(smoothPageProgress, [0, 0.2], [1, 0.985]);
  const heroGridY = useTransform(smoothPageProgress, [0, 0.24], [0, 92]);
  const pageArtifactStyle = reducedMotion
    ? undefined
    : { y: pageDriftY, x: isSmallViewport ? mobilePageDriftX : pageDriftX };

  useSEO({
    title:
      contentSettings?.seoTitle || "Vidhgrow Courses, Practice Tests and Progress Reports",
    description:
      contentSettings?.seoDescription ||
      "Vidhgrow is the official online learning platform for teacher-led courses, protected practice tests, score feedback, public profiles, and student progress reports.",
    keywords:
      "vidhgrow, online learning, test preparation, courses, exams, practice tests",
    type: "website",
    canonicalUrl: `${contentSettings?.siteUrl || window.location.origin}/`,
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const platformStats = contentSettings?.platformStats;
  const showPlatformStats =
    platformStats?.eligible === true &&
    Array.isArray(platformStats.items) &&
    platformStats.items.length === 4;
  const publicStats = showPlatformStats
    ? platformStats.items.map((stat) => ({
        ...stat,
        displayValue: `${Number(stat.value).toLocaleString()}${stat.suffix || ""}`,
      }))
    : [];
  const chartData = publicStats.map((stat) => ({
    name: stat.label,
    value: Number(stat.value) || 0,
    displayValue: stat.displayValue,
  }));

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
  const storyMeta = {
    eyebrow: contentSettings?.homeStoryEyebrow || "How the work moves",
    title:
      contentSettings?.homeStoryTitle ||
      "A study rhythm that feels easy to return to.",
    highlightedText:
      contentSettings?.homeStoryHighlightedText || "A study rhythm",
    description:
      contentSettings?.homeStoryDescription ||
      "Learn from the course, test the idea, then use the result to choose the next revision. The page stays quiet, but the work keeps moving.",
    chapters: normalizeStoryChapters(contentSettings?.homeStoryChapters),
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate("/courses");
      return;
    }

    const result = validateStudentEmail(email);
    if (!result.valid) {
      setEmailError(result.message);
      return;
    }

    setEmailError("");
    navigate(`/register?email=${encodeURIComponent(result.email)}`, {
      state: { email: result.email },
    });
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
    <div ref={pageRef} className="vg-home-shell relative overflow-x-hidden">
      <HomeParallaxStage
        scrollProgress={smoothPageProgress}
        reducedMotion={reducedMotion}
        isSmallViewport={isSmallViewport}
      />
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
        <motion.div
          className="absolute inset-0 pointer-events-none vg-hero-grid"
          style={reducedMotion ? undefined : { y: heroGridY }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <motion.div
            style={
              reducedMotion
                ? undefined
                : {
                    y: isSmallViewport ? mobileHeroY : heroY,
                    scale: isSmallViewport ? mobileHeroScale : heroScale,
                  }
            }
            initial={animations && !reducedMotion ? { opacity: 0 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1 } : {}}
            transition={animations && !reducedMotion ? { duration: 0.7 } : {}}
            className="mx-auto max-w-4xl space-y-7 text-center"
          >
            <h1 className="vg-home-hero-title text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-tight">
              {heroTitle}
              <br />
              <AnimeBrushHighlight
                className="vg-raw-highlight"
                enabled={animations && !reducedMotion}
              >
                {heroHighlight}
              </AnimeBrushHighlight>
            </h1>

            <p className="vg-home-hero-description text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
                    <Award className="w-4 h-4" />
                    Test Yourself
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="gap-2 px-6"
                >
                  <Link to="/courses">
                    <BookOpen className="w-4 h-4" />
                    Explore Courses
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
                    Start Practicing
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-6">
                  <Link to="/login">Sign In</Link>
                </Button>
              </motion.div>
            )}

            {showPlatformStats && (
              <motion.p
                initial={animations && !reducedMotion ? { opacity: 0 } : {}}
                animate={animations && !reducedMotion ? { opacity: 1 } : {}}
                transition={{ delay: 0.9 }}
                className="text-xs tracking-wide text-muted-foreground/70"
              >
                Courses, tests, reports, and rank tracking for{" "}
                <span className="text-foreground font-medium">
                  {publicStats[0].displayValue}
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
        story={storyMeta}
      />

      <Divider />

      {showPlatformStats && (
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
                {publicStats.map((stat, index) => (
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
                        {stat.displayValue}
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

            {isAuthenticated ? (
              <Button asChild size="lg" className="gap-2 px-6">
                <Link to="/courses">
                  Test Yourself
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <form
                onSubmit={handleEmailSubmit}
                className="mx-auto flex max-w-md flex-col gap-2"
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    required
                    aria-invalid={emailError ? "true" : "false"}
                    className={`h-11 flex-1 ${
                      emailError ? "border-destructive" : ""
                    }`}
                  />
                  <Button
                    type="submit"
                    className="h-11 gap-2 whitespace-nowrap px-6"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                {emailError && (
                  <p className="text-left text-sm text-destructive">
                    {emailError}
                  </p>
                )}
              </form>
            )}

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
