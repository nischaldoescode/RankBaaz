/**
 * renders crawlable public test overview pages without exposing protected questions
 *
 * @file frontend/src/pages/testseopage.jsx
 * @module frontend/src/pages/testseopage
 * @exports route component for /tests/:slug and /tests
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileQuestion,
  GraduationCap,
  Layers3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Loading from "../components/common/Loading";
import { apiMethods } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useContent } from "../context/ContentContext";
import { useSEO } from "../hooks/useSEO";

const compactDescription = (value = "", fallback = "") => {
  const text = String(value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= 158) return text;
  return `${text.slice(0, 155).replace(/\s+\S*$/, "")}...`;
};

const getDifficultyNames = (test) =>
  (test?.difficulties || []).map((difficulty) => difficulty.name).join(", ");

const TestMetric = ({ icon: Icon, label, value }) => (
  <div className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
    <Icon className="mb-3 h-5 w-5 text-blue-500" aria-hidden="true" />
    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
      {value}
    </p>
  </div>
);

const TestSeoIndex = ({ tests, loading }) => (
    <div className="min-h-screen px-4 py-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <nav className="mb-8 text-sm text-slate-500" aria-label="breadcrumb">
          <Link className="hover:text-blue-600" to="/">
            Vidhgrow
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Practice tests</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              test library
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-5xl">
              Practice tests connected to real course work
            </h1>
          </div>
          <p className="text-lg leading-8 text-slate-600 dark:text-slate-300">
            Each page explains what a test covers, how long it takes, which
            levels are available, and where it fits inside the Vidhgrow study
            loop. Start from the overview, then move into the protected test
            flow when you are ready.
          </p>
        </div>

        {loading ? (
          <div className="mt-14">
            <Loading variant="page" />
          </div>
        ) : (
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {tests.map((test) => (
              <Link
                key={test._id}
                to={`/tests/${test.slug}`}
                className="group rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/75"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {test.category?.name || "practice test"}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950 group-hover:text-blue-600 dark:text-white">
                  {test.name}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {test.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{test.totalQuestions} questions</span>
                  <span>{test.readableDuration}</span>
                  <span>{getDifficultyNames(test) || "all levels"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
);

const TestSeoPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { contentSettings } = useContent();
  const [test, setTest] = useState(null);
  const [related, setRelated] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSeoPage = async () => {
      setLoading(true);
      setError("");

      try {
        if (!slug) {
          const response = await apiMethods.courses.getTestSeoPages({
            limit: 48,
          });
          if (cancelled) return;
          setTests(response.data?.data?.tests || []);
          return;
        }

        const response = await apiMethods.courses.getTestSeoPageBySlug(slug);
        if (cancelled) return;

        setTest(response.data?.data?.test || null);
        setRelated(response.data?.data?.related || []);
      } catch (err) {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? "This test page is not available."
            : "We could not load this test page right now.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSeoPage();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const siteUrl = contentSettings?.siteUrl || window.location.origin;
  const seoDescription = useMemo(() => {
    if (!test) return "";
    return compactDescription(
      test.description,
      `${test.name} practice test on Vidhgrow with timed questions, difficulty levels, score feedback, and progress tracking.`,
    );
  }, [test]);

  useSEO({
    title: test ? `${test.name} Practice Test` : "Practice Tests",
    description:
      seoDescription ||
      "Browse Vidhgrow practice tests with course context, difficulty levels, timing, and question counts before starting an attempt.",
    keywords: test
      ? `${test.name}, ${test.name} test, Vidhgrow test, ${test.category?.name || "course"} practice`
      : "Vidhgrow practice tests, online tests, course tests",
    image: test?.image?.url,
    canonicalUrl: test ? `${siteUrl}/tests/${test.slug}` : `${siteUrl}/tests`,
    type: "article",
    structuredData: slug
      ? test
        ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Vidhgrow",
                  item: `${siteUrl}/`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Practice tests",
                  item: `${siteUrl}/tests`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: `${test.name} practice test`,
                  item: `${siteUrl}/tests/${test.slug}`,
                },
              ],
            },
            {
              "@type": "Quiz",
              "@id": `${siteUrl}/tests/${test.slug}#quiz`,
              name: `${test.name} practice test`,
              url: `${siteUrl}/tests/${test.slug}`,
              description: seoDescription,
              image: test.image?.url,
              educationalUse: "practice",
              learningResourceType: "assessment",
              assesses: test.category?.name || test.name,
              provider: {
                "@id": `${siteUrl}/#organization`,
              },
            },
          ],
        }
        : null
      : {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Vidhgrow practice tests",
          url: `${siteUrl}/tests`,
          description:
            "A public index of Vidhgrow course based practice tests with difficulty levels and learning context.",
        },
  });

  if (!slug) {
    return <TestSeoIndex tests={tests} loading={loading} />;
  }

  const handleStartTest = () => {
    if (!test?._id) return;
    sessionStorage.setItem(`test_access_${test._id}`, "granted");

    if (!isAuthenticated) {
      navigate(`/register?redirect=${encodeURIComponent(`/app/test/${test._id}`)}`);
      return;
    }

    navigate(`/app/test/${test._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16">
        <Loading variant="page" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <Search className="mb-5 h-10 w-10 text-blue-500" aria-hidden="true" />
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">
          Test page not found
        </h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          {error || "The test may be unpublished, renamed, or temporarily unavailable."}
        </p>
        <Button className="mt-8" onClick={() => navigate("/tests")}>
          Browse practice tests
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-6xl">
        <nav className="mb-8 text-sm text-slate-500" aria-label="breadcrumb">
          <Link className="hover:text-blue-600" to="/">
            Vidhgrow
          </Link>
          <span aria-hidden="true"> / </span>
          <Link className="hover:text-blue-600" to="/tests">
            Practice tests
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{test.name}</span>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              {test.category?.name || "practice test"}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              {test.name} practice test
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              {test.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleStartTest}
                className="rounded-full px-6 py-6 text-base"
              >
                {isAuthenticated ? "Start this test" : "Create account to start"}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/courses")}
                className="rounded-full px-6 py-6 text-base"
              >
                Browse courses
              </Button>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="relative"
          >
            <div className="absolute -inset-6 rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20" />
            <div className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
              {test.image?.url ? (
                <img
                  src={test.image.url}
                  alt={`${test.name} practice test cover`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,#eff6ff,#ffffff)] dark:bg-[linear-gradient(135deg,#0f172a,#020617)]">
                  <BookOpen className="h-20 w-20 text-blue-500" aria-hidden="true" />
                </div>
              )}
              <div className="space-y-3 p-5">
                <p className="text-sm text-slate-500">public test overview</p>
                <p className="text-lg font-semibold text-slate-950 dark:text-white">
                  {test.isPaid ? "Course access is checked before the attempt." : "Free to start after sign in."}
                </p>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TestMetric
            icon={FileQuestion}
            label="questions"
            value={test.totalQuestions}
          />
          <TestMetric
            icon={Clock3}
            label="time"
            value={test.readableDuration}
          />
          <TestMetric
            icon={Layers3}
            label="levels"
            value={getDifficultyNames(test) || "all levels"}
          />
          <TestMetric
            icon={GraduationCap}
            label="teacher"
            value={test.teacher?.name || "Vidhgrow"}
          />
        </section>

        <section className="mt-16 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950 dark:text-white">
              What this test helps you check
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
              This overview page is meant for planning, not for revealing the
              test itself. The attempt screen stays protected so the question
              pool, answer keys, explanations, scoring rules, and progress
              updates remain tied to your account. Use this page to understand
              the topic, time commitment, difficulty range, and course context
              before starting.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
              When you start the test, Vidhgrow checks your session, course
              access, selected difficulty, active question availability, and
              completion state. That keeps search pages useful for discovery
              while the real assessment flow stays private and fair.
            </p>
          </div>

          <div className="rounded-[30px] border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
              Difficulty breakdown
            </h2>
            <div className="mt-5 space-y-3">
              {test.difficulties.map((difficulty) => (
                <div
                  key={difficulty.name}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                      {difficulty.name}
                    </h3>
                    <span className="text-sm text-slate-500">
                      {difficulty.readableTime}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Up to {difficulty.maxQuestions} questions,{" "}
                    {difficulty.marksPerQuestion} marks per question, and{" "}
                    {difficulty.questionCount || "active"} available questions
                    in this level.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {test.teacher?.username && (
          <section className="mt-14 rounded-[30px] border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
              teacher context
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {test.teacher.profileImage?.url ? (
                  <img
                    src={test.teacher.profileImage.url}
                    alt={`${test.teacher.name} teacher profile`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
                    {(test.teacher.name || "V").charAt(0).toUpperCase()}
                  </span>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                    {test.teacher.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    verified teacher profile on Vidhgrow
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/teacher/@${test.teacher.username}`)}
                className="rounded-full"
              >
                View teacher profile
              </Button>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-600">
                  keep practicing
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
                  Related practice tests
                </h2>
              </div>
              <Link
                to="/tests"
                className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all tests
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item._id}
                  to={`/tests/${item.slug}`}
                  className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/75"
                >
                  <p className="text-sm text-slate-500">
                    {item.category?.name || "practice test"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
};

export default TestSeoPage;
