/**
 * renders the shared cookie consent component used across public pages and app level flows
 *
 * @file frontend/src/components/common/cookieconsent.jsx
 * @module frontend/src/components/common/cookieconsent
 * @exports component used by pages and shared layouts
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const CONSENT_KEY = "vidhgrow_cookie_consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = (all = true) => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ accepted: true, all, timestamp: Date.now() })
    );
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[calc(100vw-2rem)] lg:mx-0 lg:left-6 lg:right-auto lg:max-w-lg"
        >
          <div className="bg-background border border-border rounded-2xl shadow-xl p-4 space-y-4 sm:p-5">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">We use cookies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use essential cookies to keep the site working and analytics cookies to understand
                how you use Vidhgrow. No advertising cookies.{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  Learn more
                </Link>
              </p>
            </div>

            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">Essential</p>
                    <p>Authentication, security, session management. Always active.</p>
                  </div>
                  <span className="text-green-500 font-semibold flex-shrink-0">Always on</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">Analytics</p>
                    <p>Anonymized usage data to improve the platform. Optional.</p>
                  </div>
                  <span className="text-muted-foreground flex-shrink-0">Optional</span>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                onClick={() => accept(true)}
                className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Accept all
              </button>
              <button
                onClick={() => accept(false)}
                className="flex-1 h-9 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Essential only
              </button>
              <button
                onClick={() => setShowDetails((p) => !p)}
                className="col-span-2 h-9 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors sm:col-span-1"
              >
                {showDetails ? "Less" : "Details"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
