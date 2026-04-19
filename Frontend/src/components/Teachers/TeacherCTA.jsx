import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

const TeacherCTASection = () => {
  const [count, setCount] = useState(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:7000"}/api/teachers/waitlist-count`)
      .then((r) => setCount(r.data.data?.count || 0))
      .catch(() => {});
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 sm:p-12"
        >
          {/* subtle background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </div>

          <div className="relative flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">

              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Share your expertise.{" "}
                <span className="text-primary">Earn from it.</span>
              </h2>

              <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                Join our invite-only teacher program. Keep 80% of every course
                sale.
              </p>

              {count !== null && (
                <p className="text-sm text-muted-foreground mb-6">
                  <strong className="text-foreground">{count}</strong> educator{count !== 1 ? "s" : ""} already on the waiting list
                </p>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                <Link
                  to="/teacher"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Apply to Teach
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  to="/teacher/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Already a teacher? Sign in
                </Link>
              </div>
            </div>

            {/* perks */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 w-full max-w-xs">
              {[
                { label: "Revenue share", value: "80%" },
                { label: "Approval time", value: "< 48h" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-background border border-border rounded-xl p-3 text-center"
                >
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TeacherCTASection;