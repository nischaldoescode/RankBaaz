import React from "react";
import { motion } from "framer-motion";

const InviteExpired = () => (
  <div
    style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Inter Variable', sans-serif",
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 400, width: "100%", textAlign: "center" }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          background: "#fee2e2",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 12,
        }}
      >
        Invite Link Expired
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#64748b",
          lineHeight: 1.7,
          marginBottom: 32,
        }}
      >
        This invite link is no longer valid. Invite links expire after{" "}
        <strong style={{ color: "#ef4444" }}>4 minutes</strong> for security.
        Please contact us to request a new invitation.
      </p>

      <a
        href="mailto:support@vidhgrow.online"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 28px",
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          color: "#fff",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          boxShadow: "0 4px 14px rgba(239,68,68,0.3)",
          cursor: "pointer",
        }}
      >
        Contact Support
      </a>

      <p style={{ marginTop: 20, fontSize: 13, color: "#94a3b8" }}>
        Already have an account?{" "}
        <a
          href="/login"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign in
        </a>
      </p>
    </motion.div>
  </div>
);

export default InviteExpired;
