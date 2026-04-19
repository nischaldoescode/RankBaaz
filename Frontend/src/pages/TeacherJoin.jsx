import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  TrendingUp,
  Globe,
  ChevronDown,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const CounterAnimation = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const WaitlistCounter = () => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/teachers/waitlist-count`)
      .then((r) => setCount(r.data.data?.count || 0))
      .catch(() => setCount(null));
  }, []);

  if (count === null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-sm text-amber-700 font-medium"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <span>
        <strong>{count}</strong> educator{count !== 1 ? "s" : ""} on the waiting
        list
      </span>
    </motion.div>
  );
};

const ApplicationForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    qualification: "",
    reason: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.country) {
      toast.error("Please select your country");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/teachers/apply`, form);
      setSubmitted(true);
      toast.success("Application submitted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 space-y-4"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          Application received
        </h3>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm leading-relaxed">
          We review every application personally. You will hear from us via
          email if selected.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Full Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your full name"
            required
            className="h-11"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Email Address
          </label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="you@example.com"
            required
            className="h-11"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
          Country
        </label>
        <select
          value={form.country}
          onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
          required
          className="w-full h-11 px-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        >
          <option value="">Select your country</option>
          <option value="india">India</option>
          <option value="nepal">Nepal</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          We currently support India and Nepal for teacher payouts.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
          Qualification
        </label>
        <textarea
          value={form.qualification}
          onChange={(e) =>
            setForm((p) => ({ ...p, qualification: e.target.value }))
          }
          placeholder="Degrees, certifications, years of experience..."
          required
          rows={3}
          className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
          Why do you want to teach on Vidhgrow?
        </label>
        <textarea
          value={form.reason}
          onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
          placeholder="Tell us about your teaching philosophy and what you hope to offer students..."
          required
          rows={4}
          className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full h-11 gap-2">
        {loading ? "Submitting..." : "Submit Application"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Applications are reviewed personally. We respond within 3-5 business
        days.
      </p>
    </form>
  );
};

const TeacherJoin = () => {
  const perks = [
    {
      icon: TrendingUp,
      title: "Earn 80% revenue",
      description:
        "Keep 80% of every course sale. We handle payments, infrastructure, and support.",
    },
    {
      icon: Users,
      title: "Reach serious learners",
      description:
        "Our platform attracts motivated students actively seeking to improve.",
    },
    {
      icon: Shield,
      title: "Full course control",
      description:
        "Create, price, and manage your courses entirely on your own terms.",
    },
    {
      icon: Zap,
      title: "Fast payouts",
      description:
        "Receive your earnings directly via Razorpay (India) or eSewa/Khalti (Nepal).",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-20">
          <div className="w-[700px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Invite-only beta
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
          >
            Teach on{" "}
            <span className="text-primary relative inline-block">
              Vidhgrow
              <motion.span
                className="absolute -bottom-1 left-0 h-[3px] bg-primary/30 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.7, duration: 0.6 }}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Share your expertise, build your audience, and earn from your
            knowledge. We handle everything else.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <WaitlistCounter />
            <a
              href="https://teacher.vidhgrow.online"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Already have an account? Sign in
            </a>
          </motion.div>

          {/* stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 gap-6 max-w-lg mx-auto pt-4"
          >
            {[
              { value: 80, suffix: "%", label: "Revenue share" },
              { value: 48, suffix: "h", label: "Approval time" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  <CounterAnimation end={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">
              Why teach with us
            </p>
            <h2 className="text-3xl font-bold">
              Built for educators, not platforms
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-5 bg-background border border-border/60 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all duration-300"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <perk.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">
                  {perk.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {perk.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payment Info ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">
              Payouts
            </p>
            <h2 className="text-3xl font-bold">Get paid your way</h2>
          </div>

        </div>
      </section>

      {/* ── Application Form ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20" id="apply">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary/70 mb-3">
              Apply now
            </p>
            <h2 className="text-3xl font-bold mb-3">Join as a teacher</h2>
            <p className="text-muted-foreground text-sm">
              Tell us about yourself. We review every application personally.
            </p>
          </div>

          <div className="bg-background border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <ApplicationForm />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeacherJoin;
