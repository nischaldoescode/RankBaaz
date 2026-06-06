/**
 * renders the public teacher application page with local draft state and backend status checks
 *
 * @file frontend/src/pages/teacherjoin.jsx
 * @module frontend/src/pages/teacherjoin
 * @returns {JSX.Element} teacher application route with review, registered, and form states
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:7000").replace(
  /\/$/,
  ""
);
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const apiUrl = (path) => `${API}${path.startsWith("/") ? path : `/${path}`}`;

// localstorage key
const LS_KEY = "vg_teacher_application";

const getStored = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setStored = (data) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
};

const clearStored = () => {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
};

const scrollToApply = () => {
  if (typeof window === "undefined") return;

  const target = document.getElementById("apply");
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
};

// ui primitives

const inputCls =
  "w-full h-12 px-4 border-2 border-border rounded-xl text-sm bg-background text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground";

const CountryFlag = ({ country }) =>
  country === "india" ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      IN
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      NP
    </span>
  );

// status banners

const ReviewInProgress = ({ email, onReset }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="w-full max-w-lg mx-auto"
  >
    <div className="bg-background border-2 border-amber-300 rounded-2xl p-8 text-center shadow-sm">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        Application Under Review
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        We received your application for{" "}
        <strong className="text-foreground">{email}</strong>. Our team is
        reviewing it and will send an invite link to your email once approved.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 text-left space-y-1.5">
        <p>Check your inbox, including the spam folder.</p>
        <p>Reviews typically take 24-48 hours.</p>
        <p>Invite links expire in 4 minutes. Register promptly.</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-xs font-semibold text-primary underline underline-offset-4 cursor-pointer"
      >
        Use a different email
      </button>
    </div>
  </motion.div>
);

const AlreadyRegistered = () => {
  const PORTAL_URL =
    import.meta.env.VITE_TEACHER_PORTAL_URL || "http://localhost:5175";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-background border-2 border-green-300 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          You&apos;re already a teacher!
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Your teacher account is ready. Sign in to your dashboard to manage
          courses, view analytics, and more.
        </p>

        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Open Teacher Dashboard
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </motion.div>
  );
};

// application form

const ApplicationForm = ({ onApplied }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    qualification: "",
    reason: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Full name required (min 2 chars)";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required";
    if (!form.qualification.trim() || form.qualification.trim().length < 10)
      e.qualification = "Qualification required (min 10 chars)";
    if (!form.reason.trim() || form.reason.trim().length < 20)
      e.reason = "Please tell us more (min 20 chars)";
    if (!form.country) e.country = "Select your country";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await axios.post(apiUrl("/teachers/apply"), form);
      // store in localstorage so user sees status on revisit
      setStored({
        email: form.email,
        status: "pending",
        appliedAt: new Date().toISOString(),
      });
      onApplied(form.email);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit";
      if (msg.toLowerCase().includes("already")) {
        // keep the existing application state visible
        setStored({
          email: form.email,
          status: "pending",
          appliedAt: new Date().toISOString(),
        });
        onApplied(form.email);
      } else {
        setErrors({ submit: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    },
    onFocus: (e) => (e.target.style.borderColor = "hsl(var(--primary))"),
    onBlur: (e) => (e.target.style.borderColor = ""),
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg mx-auto bg-background border border-border rounded-2xl p-4 sm:p-8 shadow-sm"
    >
      <h3 className="text-lg font-bold text-foreground mb-1">Apply to Teach</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Tell us about yourself. We review every application within 48 hours.
      </p>

      <div className="flex flex-col gap-5">
        {/* name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            className={inputCls}
            placeholder="Ramesh Kumar"
            {...field("name")}
            maxLength={100}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        {/* email */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Email Address <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            className={inputCls}
            placeholder="you@example.com"
            {...field("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email}</p>
          )}
        </div>

        {/* country */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Country <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {["india", "nepal"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, country: c }));
                  setErrors((p) => ({ ...p, country: undefined }));
                }}
                className={`flex items-center justify-center sm:justify-start gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium cursor-pointer ${
                  form.country === c
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                <CountryFlag country={c} />
                <span className="capitalize">{c}</span>
              </button>
            ))}
          </div>
          {errors.country && (
            <p className="text-xs text-destructive mt-1">{errors.country}</p>
          )}
        </div>

        {/* qualification */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Qualification <span className="text-destructive">*</span>
          </label>
          <textarea
            className={`${inputCls} h-auto py-3 resize-none`}
            rows={2}
            placeholder="B.Tech CSE, 5 years teaching experience..."
            {...field("qualification")}
            maxLength={300}
          />
          {errors.qualification && (
            <p className="text-xs text-destructive mt-1">
              {errors.qualification}
            </p>
          )}
        </div>

        {/* reason */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Why do you want to teach on Vidhgrow?{" "}
            <span className="text-destructive">*</span>
          </label>
          <textarea
            className={`${inputCls} h-auto py-3 resize-none`}
            rows={3}
            placeholder="I want to help students..."
            {...field("reason")}
            maxLength={600}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {form.reason.length}/600
          </p>
          {errors.reason && (
            <p className="text-xs text-destructive mt-1">{errors.reason}</p>
          )}
        </div>

        {errors.submit && (
          <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
            {errors.submit}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div
                style={{
                  width: 16,
                  height: 16,
                  border: "2.5px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </form>
  );
};

// perks grid

const PERKS = [
  {
    title: "Clear Teacher Share",
    desc: "Know how course earnings are handled before you publish.",
  },
  {
    title: "Analytics",
    desc: "See student performance, top scorers, and more.",
  },
  {
    title: "Verified Platform",
    desc: "All teachers are vetted for quality.",
  },
  {
    title: "Full Control",
    desc: "Create, edit, and manage your own courses.",
  },
];

// main component

const TeacherJoin = () => {
  const [appStatus, setAppStatus] = useState(null); // null | "loading" | "none" | "pending" | "invited" | "registered"
  const [appliedEmail, setAppliedEmail] = useState(null);
  const PORTAL_URL =
    import.meta.env.VITE_TEACHER_PORTAL_URL || "http://localhost:5175";

  // keep hash navigation focused on the form
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#apply") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // check application status from storage and backend
  useEffect(() => {
    const stored = getStored();

    if (!stored?.email) {
      setAppStatus("none");
      return;
    }

    setAppStatus("loading");
    setAppliedEmail(stored.email);

    axios
      .post(apiUrl("/teachers/application/status"), { email: stored.email })
      .then((r) => {
        const { status } = r.data.data;
        setAppStatus(status);
        if (status === "registered") {
          // update localstorage
          setStored({ ...stored, status: "registered" });
        }
      })
      .catch(() => {
        // if backend fails, use localstorage status
        setAppStatus(stored.status || "pending");
      });
  }, []);

  const handleApplied = (email) => {
    setAppliedEmail(email);
    setAppStatus("pending");
  };

  const handleResetApplication = () => {
    clearStored();
    setAppliedEmail(null);
    setAppStatus("none");
    if (typeof window !== "undefined") {
      window.setTimeout(scrollToApply, 50);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#apply") return;
    if (appStatus === null || appStatus === "loading") return;

    const timer = window.setTimeout(scrollToApply, 80);
    return () => window.clearTimeout(timer);
  }, [appStatus]);

  const showForm = appStatus === "none";
  const showReview = appStatus === "pending" || appStatus === "invited";
  const showRegistered = appStatus === "registered";
  const showLoader = appStatus === null || appStatus === "loading";

  return (
    <div className="min-h-screen bg-background">
      {/* hero */}
      <section className="relative overflow-hidden">
        {/* full-bleed background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* full-width grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)/0.04) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)/0.04) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-28 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 sm:mb-5 leading-tight"
          >
            Teach with Vidhgrow.{" "}
            <span className="text-primary">Grow with care.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Create focused courses, reach serious learners, and keep every
            teaching step calm.
          </motion.p>

          {/* login link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 sm:mb-12"
          >
            <a
              href="#apply"
              onClick={(e) => {
                e.preventDefault();
                scrollToApply();
              }}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Apply to Teach
            </a>

            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
            >
              Already a teacher? Sign in
            </a>
          </motion.div>

          {/* perks */}
          <div className="hidden sm:grid grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {PERKS.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="bg-background/80 backdrop-blur border border-border rounded-xl p-4 text-left hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <p className="text-sm font-semibold text-foreground mb-1">
                  {p.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* apply section */}
      <section
        id="apply"
        className="py-8 px-4 sm:py-16 sm:px-6"
        style={{ scrollMarginTop: 96 }}
      >
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {showLoader && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-16"
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    border: "3px solid hsl(var(--primary)/0.2)",
                    borderTopColor: "hsl(var(--primary))",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              </motion.div>
            )}

            {showRegistered && <AlreadyRegistered key="registered" />}

            {showReview && (
              <ReviewInProgress
                key="review"
                email={appliedEmail}
                onReset={handleResetApplication}
              />
            )}

            {showForm && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <ApplicationForm onApplied={handleApplied} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default TeacherJoin;
