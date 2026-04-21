import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";

const SUPPORT_EMAIL = "support@vidhgrow.online";
const FRONTEND_URL =
  import.meta.env.VITE_FRONTEND_URL || "https://vidhgrow.online";

const InviteExpired = ({ initialReason = "expired" }) => {
  const [params] = useSearchParams();
  const reason = params.get("reason") || initialReason;
  const [counted, setCounted] = useState(false);

  // reasons: "expired" | "already_registered" | "invalid"
  const config = {
    expired: {
      emoji: "⏱",
      title: "Invite Link Expired",
      color: "#f59e0b",
      bg: "#fffbeb",
      border: "#fde68a",
      message:
        "This invite link has expired. Invite links are valid for only 4 minutes after being sent.",
      action: "Please contact admin to resend your invite.",
    },
    already_registered: {
      emoji: "✅",
      title: "Already Registered",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      message: "This invite has already been used to create an account.",
      action: "You can sign in to your teacher dashboard.",
    },
    invalid: {
      emoji: "❌",
      title: "Invalid Link",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      message: "This invite link is invalid or has been tampered with.",
      action: "Please contact support if you believe this is an error.",
    },
  };

  const c = config[reason] || config.expired;
  const PORTAL_URL =
    import.meta.env.VITE_TEACHER_PORTAL_URL || "http://localhost:5175";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f0f9ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter Variable', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 440 }}
      >
        {/* card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 32px",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid rgba(226,232,240,0.8)",
            textAlign: "center",
          }}
        >
          {/* icon */}
          <div
            style={{
              width: 72,
              height: 72,
              background: c.bg,
              border: `2px solid ${c.border}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 24px",
            }}
          >
            {c.emoji}
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 12,
            }}
          >
            {c.title}
          </h1>

          <p
            style={{
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.7,
              marginBottom: 8,
            }}
          >
            {c.message}
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#374151",
              fontWeight: 500,
              marginBottom: 28,
            }}
          >
            {c.action}
          </p>

          {/* timeline for expired */}
          {reason === "expired" && (
            <div
              style={{
                padding: "14px 16px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 12,
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#92400e",
                  marginBottom: 8,
                }}
              >
                What happens next?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Admin will be notified that your link expired",
                  "A new invite link will be sent to your email",
                  "You'll have 4 minutes to complete registration",
                  "Check your spam folder if you don't see it",
                ].map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#78350f",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reason === "already_registered" && (
              <a
                href={PORTAL_URL}
                style={{
                  display: "block",
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "center",
                  boxShadow: "0 3px 12px rgba(37,99,235,0.25)",
                }}
              >
                Sign in to Dashboard
              </a>
            )}

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Expired Teacher Invite Link&body=Hi, my invite link expired before I could register. Please resend the invite. Thank you.`}
              style={{
                display: "block",
                padding: "12px 24px",
                background:
                  reason === "already_registered"
                    ? "#f8fafc"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: reason === "already_registered" ? "#475569" : "#fff",
                border:
                  reason === "already_registered"
                    ? "1.5px solid #e2e8f0"
                    : "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
                boxShadow:
                  reason === "already_registered"
                    ? "none"
                    : "0 3px 12px rgba(37,99,235,0.25)",
              }}
            >
              {reason === "already_registered"
                ? "Contact Support"
                : "Request New Invite"}
            </a>

            <a
              href={FRONTEND_URL}
              style={{
                display: "block",
                padding: "10px 24px",
                background: "transparent",
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              ← Back to Vidhgrow
            </a>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#94a3b8",
            marginTop: 20,
          }}
        >
          Need help?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#2563eb" }}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default InviteExpired;
