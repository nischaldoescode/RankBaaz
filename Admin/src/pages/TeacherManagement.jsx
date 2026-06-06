/**
 * renders the admin teacher management workspace with application review and invite tools
 *
 * @file admin/src/pages/teachermanagement.jsx
 * @module admin/src/pages/teachermanagement
 * @returns {JSX.Element} admin route for teacher applications, documents, and profile actions
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../contexts/AdminContext.jsx";
import toast from "react-hot-toast";

// helpers

const countryName = (country) => (country === "india" ? "India" : "Nepal");

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  invited: {
    label: "Invited",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  registered: {
    label: "Registered",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  approved: {
    label: "Approved",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  rejected: {
    label: "Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  not_uploaded: {
    label: "No Documents",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
  verified: {
    label: "Verified",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  rejected_docs: {
    label: "Docs Rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
};

const Badge = ({ label, color, bg, border }) => (
  <span
    style={{
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      color,
      background: bg,
      border: `1px solid ${border}`,
      display: "inline-block",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

// email template presets
const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    label: "Standard Welcome",
    subject: "You're invited to teach on Vidhgrow",
    body: `We've reviewed your application and we're excited to invite you to join Vidhgrow as a teacher!

Your expertise and passion for education will be a great addition to our platform. As a teacher, you'll:

- Reach thousands of motivated students
- Create courses with full control over pricing and content
- Work with clear teacher terms before publishing

Click the button below to complete your registration. The link expires in 4 minutes, so please register promptly.

We look forward to having you on board!

Warm regards,
The Vidhgrow Team`,
  },
  {
    id: "qualified",
    label: "Qualified Applicant",
    subject: "Invitation to teach on Vidhgrow",
    body: `We've reviewed your application and would like to invite you to teach on Vidhgrow.

Your background is a good fit for the courses our students are looking for. As a Vidhgrow teacher, you will get clear course tools, a reviewed profile, and transparent earning terms before publishing.

Please complete your registration using the link below. It expires in 4 minutes.

Regards,
The Vidhgrow Team`,
  },
  {
    id: "custom",
    label: "Custom",
    subject: "",
    body: "",
  },
];

// components

const EmailEditor = ({ application, onClose, onSent }) => {
  const { adminRequest } = useAdmin();
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES[0].body);
  const [mode, setMode] = useState("text"); // "text" | "html"
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [showDesignPanel, setShowDesignPanel] = useState(false);

  const applyTemplate = (idx) => {
    setSelectedTemplate(idx);
    if (EMAIL_TEMPLATES[idx].id !== "custom") {
      setSubject(EMAIL_TEMPLATES[idx].subject);
      setBody(EMAIL_TEMPLATES[idx].body);
    }
  };

  // build html email
  const buildHtmlEmail = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:100%;">
        <tr><td style="padding:32px 40px 24px;text-align:center;border-bottom:1px solid #e9ecef;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Vidhgrow" style="height:40px;max-width:160px;object-fit:contain;margin-bottom:12px;" />` : ""}
          <p style="margin:0;color:#64748b;font-size:13px;">Teacher Invitation</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${application.name}</strong>,</p>
          <div style="color:#374151;font-size:14px;line-height:1.9;white-space:pre-wrap;">${body}</div>
          <div style="margin:36px 0;text-align:center;">
            <a href="{{SIGNUP_LINK}}" style="display:inline-block;padding:14px 36px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
              Complete Registration
            </a>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">
            Link expires in <strong style="color:#ef4444;">4 minutes</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background:#f8f9fa;border-top:1px solid #e9ecef;">
          <p style="margin:0;color:#999;font-size:12px;">© ${new Date().getFullYear()} Vidhgrow. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body required");
      return;
    }
    setSending(true);
    try {
      await adminRequest("POST", "/teachers/applications/invite", {
        applicationId: application._id,
        emailSubject: subject,
        emailContent: mode === "html" ? buildHtmlEmail() : body,
        isHtml: mode === "html",
      });
      toast.success("Invite sent successfully");
      onSent();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const inputS = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 13,
    color: "#111827",
    background: "#f9fafb",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  return (
    <div
      className="teacher-admin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483000,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="teacher-admin-email-modal teacher-admin-modal-panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 800,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* sticky header */}
        <div
          className="teacher-admin-modal-header"
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              Send Invite Email
            </h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>
              To: <strong>{application.name}</strong> · {application.email} ·{" "}
              {countryName(application.country)}
            </p>
          </div>
          <div
            className="teacher-admin-modal-controls"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            {/* mode toggle */}
            <div
              style={{
                display: "flex",
                background: "#f3f4f6",
                borderRadius: 8,
                padding: 2,
              }}
            >
              {["text", "html"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: mode === m ? "#fff" : "transparent",
                    fontSize: 12,
                    fontWeight: mode === m ? 600 : 400,
                    color: mode === m ? "#111827" : "#6b7280",
                    cursor: "pointer",
                    boxShadow:
                      mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreview((p) => !p)}
              style={{
                padding: "6px 12px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: preview ? "#f3f4f6" : "#fff",
                color: "#374151",
              }}
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              onClick={() => setShowDesignPanel((p) => !p)}
              style={{
                padding: "6px 12px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: showDesignPanel ? "#eff6ff" : "#fff",
                color: showDesignPanel ? "#2563eb" : "#374151",
              }}
            >
              Design
            </button>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "#f3f4f6",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
                color: "#6b7280",
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="teacher-admin-email-body" style={{ display: "flex", flex: 1 }}>
          {/* main editor */}
          <div className="teacher-admin-email-editor" style={{ flex: 1, padding: 24, minWidth: 0 }}>
            {/* template selector */}
            {!preview && (
              <div style={{ marginBottom: 18 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: 8,
                  }}
                >
                  Templates
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {EMAIL_TEMPLATES.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(i)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${selectedTemplate === i ? "#2563eb" : "#e5e7eb"}`,
                        background: selectedTemplate === i ? "#eff6ff" : "#fff",
                        color: selectedTemplate === i ? "#2563eb" : "#374151",
                        fontSize: 12,
                        fontWeight: selectedTemplate === i ? 600 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {preview ? (
              // preview panel
              mode === "html" ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 12,
                      color: "#374151",
                    }}
                  >
                    <strong>Subject:</strong> {subject}
                    <span style={{ marginLeft: 16, color: "#94a3b8" }}>
                      HTML mode
                    </span>
                  </div>
                  <iframe
                    srcDoc={buildHtmlEmail()}
                    style={{ width: "100%", height: 500, border: "none" }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      fontSize: 12,
                      color: "#374151",
                    }}
                  >
                    <strong>Subject:</strong> {subject}
                  </div>
                  <div style={{ padding: 24 }}>
                    <p
                      style={{
                        fontSize: 14,
                        color: "#374151",
                        lineHeight: 1.9,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {body}
                    </p>
                    <div style={{ marginTop: 24, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "12px 28px",
                          background: primaryColor,
                          color: "#fff",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        Complete Registration
                      </span>
                    </div>
                    <p
                      style={{
                        marginTop: 14,
                        fontSize: 12,
                        color: "#9ca3af",
                        textAlign: "center",
                      }}
                    >
                      Link expires in 4 minutes
                    </p>
                  </div>
                </div>
              )
            ) : (
              // editor
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 6,
                    }}
                  >
                    Subject *
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      ...inputS,
                      height: 42,
                      maxWidth: 520,
                      background: "#fff",
                      borderRadius: 12,
                      padding: "12px 16px",
                      fontSize: 14,
                      fontWeight: 500,
                      letterSpacing: "0.2px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      marginBottom: 2,
                    }}
                    placeholder="Email subject..."
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      {mode === "html" ? "HTML Body" : "Email Body"} *
                    </label>
                    {mode === "text" && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        The registration link button is added automatically
                      </span>
                    )}
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={mode === "html" ? 18 : 12}
                    style={{
                      ...inputS,
                      height: "auto",
                      resize: "vertical",
                      lineHeight: 1.7,
                      fontFamily: mode === "html" ? "monospace" : "inherit",
                      fontSize: mode === "html" ? 12 : 13,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    placeholder={
                      mode === "html"
                        ? `<p>Hi ${application.name},</p>\n<p>Your custom HTML email content here...</p>\n<p>Use {{SIGNUP_LINK}} for the registration button.</p>`
                        : "Your email message here...\n\nWe'll add the registration link automatically at the bottom."
                    }
                    spellCheck={mode === "text"}
                  />
                  {mode === "html" && (
                    <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                      Use{" "}
                      <code
                        style={{
                          background: "#f3f4f6",
                          padding: "1px 4px",
                          borderRadius: 4,
                        }}
                      >
                        {"{{SIGNUP_LINK}}"}
                      </code>{" "}
                      where you want the registration button to appear.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* design panel */}
          {showDesignPanel && !preview && (
            <div
              className="teacher-admin-design-panel"
              style={{
                width: 220,
                borderLeft: "1px solid #f1f5f9",
                padding: 20,
                background: "#fafafa",
                flexShrink: 0,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  marginBottom: 16,
                }}
              >
                Design
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Logo URL
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ ...inputS, height: 36, fontSize: 11 }}
                  placeholder="https://..."
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="logo preview"
                    style={{
                      height: 28,
                      marginTop: 6,
                      objectFit: "contain",
                      maxWidth: "100%",
                    }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Button Color
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: 36,
                      height: 36,
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 8,
                      cursor: "pointer",
                      padding: 2,
                    }}
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ ...inputS, height: 36, fontSize: 11, flex: 1 }}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
              </div>

              {/* button preview */}
              <div style={{ padding: "10px 0", textAlign: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "8px 18px",
                    background: primaryColor,
                    color: "#fff",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Button Preview
                </span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: "10px 12px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                }}
              >
                <p style={{ fontSize: 10, color: "#92400e", lineHeight: 1.5 }}>
                  Design options only apply in HTML mode. Switch to HTML mode to
                  use full design control.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* sticky footer */}
        <div
          className="teacher-admin-modal-footer"
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            bottom: 0,
            background: "#fff",
          }}
        >
          <p style={{ fontSize: 12, color: "#94a3b8" }}>
            {mode === "html"
              ? "html mode with full control"
              : "text mode with auto styling"}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 20px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: "#fff",
                color: "#374151",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{
                padding: "9px 22px",
                border: "none",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                cursor: sending ? "not-allowed" : "pointer",
                background: sending
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {sending ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Sending...
                </>
              ) : (
                `Send Invite${mode === "html" ? " (HTML)" : ""}`
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </div>
  );
};

const TeacherDetailModal = ({ teacher, onClose, onRefresh }) => {
  const { adminRequest } = useAdmin();
  const [tab, setTab] = useState("overview");
  const [docAction, setDocAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyDocs = async (approved) => {
    setLoading(true);
    try {
      await adminRequest("POST", "/teachers/admin/verify-documents", {
        teacherId: teacher._id,
        approved,
        rejectionReason: approved ? null : rejectionReason,
      });
      toast.success(`Documents ${approved ? "verified" : "rejected"}`);
      onRefresh();
      onClose();
    } catch {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDocs = async () => {
    setLoading(true);
    try {
      await adminRequest("POST", "/teachers/admin/request-documents", {
        teacherId: teacher._id,
        note: requestNote,
      });
      toast.success("Document request sent. Account blocked.");
      onRefresh();
      onClose();
    } catch {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const reason = deleteReason.trim();
    if (reason.length < 10) {
      toast.error("Deletion reason must be at least 10 characters");
      return;
    }
    if (
      !window.confirm(`Delete teacher ${teacher.name}? This cannot be undone.`)
    )
      return;
    setLoading(true);
    try {
      await adminRequest("DELETE", `/teachers/admin/${teacher._id}`, {
        reason,
      });
      toast.success("Teacher deleted and notified by email");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const TABS = ["overview", "documents", "courses", "actions"];

  return (
    <div
      className="teacher-admin-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2147483000,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="teacher-admin-modal-panel"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        {/* header */}
        <div
          className="teacher-admin-modal-header"
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            className="teacher-detail-identity"
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            {teacher.profileImage?.url ? (
              <img
                src={teacher.profileImage.url}
                alt={teacher.name}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #e5e7eb",
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#2563eb",
                }}
              >
                {teacher.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
                {teacher.name}
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                @{teacher.username} ·{" "}
                {countryName(teacher.country)} · {teacher.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: "none",
              background: "#f3f4f6",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {/* tabs */}
        <div
          className="teacher-detail-tabs"
          style={{
            display: "flex",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 24px",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: `2px solid ${tab === t ? "#2563eb" : "transparent"}`,
                background: "none",
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? "#2563eb" : "#6b7280",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="teacher-detail-body" style={{ padding: 24 }}>
          {/* overview tab */}
          {tab === "overview" && (
            <div
              className="teacher-detail-overview-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                { label: "Full Name", value: teacher.name },
                { label: "Username", value: `@${teacher.username}` },
                { label: "Email", value: teacher.email },
                {
                  label: "Country",
                  value: teacher.country === "india" ? "India" : "Nepal",
                },
                { label: "Age", value: teacher.age },
                { label: "Gender", value: teacher.gender },
                {
                  label: "Document Status",
                  value: teacher.documentStatus,
                  badge: true,
                },
                {
                  label: "Access Blocked",
                  value: teacher.accessBlocked ? "Yes" : "No",
                },
                {
                  label: "Payment Verified",
                  value: teacher.paymentDetails?.verified ? "Yes" : "No",
                },
                {
                  label: "Joined",
                  value: new Date(teacher.createdAt).toLocaleDateString(),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "12px 14px",
                    background: "#f9fafb",
                    borderRadius: 10,
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <p
                    style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}

              {teacher.bio && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "12px 14px",
                    background: "#f9fafb",
                    borderRadius: 10,
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <p
                    style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}
                  >
                    Bio
                  </p>
                  <p style={{ fontSize: 13, color: "#374151" }}>
                    {teacher.bio}
                  </p>
                </div>
              )}

              {teacher.qualification && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "12px 14px",
                    background: "#f9fafb",
                    borderRadius: 10,
                    border: "1px solid #f3f4f6",
                  }}
                >
                  <p
                    style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}
                  >
                    Qualification
                  </p>
                  <p style={{ fontSize: 13, color: "#374151" }}>
                    {teacher.qualification}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* documents tab */}
          {tab === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: "12px 16px",
                  background:
                    teacher.documentStatus === "verified"
                      ? "#f0fdf4"
                      : teacher.documentStatus === "pending"
                        ? "#fffbeb"
                        : "#f9fafb",
                  border: `1px solid ${
                    teacher.documentStatus === "verified"
                      ? "#bbf7d0"
                      : teacher.documentStatus === "pending"
                        ? "#fde68a"
                        : "#e5e7eb"
                  }`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#374151",
                }}
              >
                Status: <strong>{teacher.documentStatus}</strong>
                {teacher.documentRequestNote && (
                  <p style={{ marginTop: 6, color: "#6b7280" }}>
                    Request note: {teacher.documentRequestNote}
                  </p>
                )}
                {teacher.documentRejectionReason && (
                  <p style={{ marginTop: 6, color: "#dc2626" }}>
                    Rejection reason: {teacher.documentRejectionReason}
                  </p>
                )}
              </div>

              {teacher.documents?.length > 0 ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {teacher.documents.map((doc, i) => (
                    <a
                      key={i}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        textDecoration: "none",
                        color: "#374151",
                        background: "#f9fafb",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "#2563eb")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "#e5e7eb")
                      }
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background: "#eff6ff",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>
                          Document {i + 1}
                        </p>
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>
                          {doc.originalName || "View document"}
                        </p>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="2"
                        style={{ marginLeft: "auto" }}
                      >
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  No documents uploaded yet.
                </p>
              )}

              {teacher.documentStatus === "pending" && (
                <div
                  className="teacher-detail-doc-actions"
                  style={{ display: "flex", gap: 10, marginTop: 8 }}
                >
                  <button
                    onClick={() => handleVerifyDocs(true)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      height: 42,
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    Approve Documents
                  </button>
                  <button
                    onClick={() => setDocAction("reject")}
                    disabled={loading}
                    style={{
                      flex: 1,
                      height: 42,
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    Reject Documents
                  </button>
                </div>
              )}

              {docAction === "reject" && (
                <div
                  style={{
                    padding: 16,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                  }}
                >
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection (visible to teacher)..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #fecaca",
                      borderRadius: 8,
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={() => handleVerifyDocs(false)}
                    disabled={!rejectionReason.trim() || loading}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      height: 40,
                      background: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor:
                        !rejectionReason.trim() || loading
                          ? "not-allowed"
                          : "pointer",
                      opacity: !rejectionReason.trim() ? 0.6 : 1,
                    }}
                  >
                    Confirm Rejection
                  </button>
                </div>
              )}

              {/* request documents button */}
              {teacher.documentStatus !== "pending" && (
                <div
                  style={{
                    padding: 14,
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 10,
                    marginTop: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#92400e",
                      marginBottom: 10,
                    }}
                  >
                    Request documents from teacher
                  </p>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Note to teacher (why documents are needed)..."
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid #fde68a",
                      borderRadius: 8,
                      fontSize: 13,
                      outline: "none",
                      boxSizing: "border-box",
                      resize: "vertical",
                      fontFamily: "inherit",
                      marginBottom: 10,
                    }}
                  />
                  <button
                    onClick={handleRequestDocs}
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: 40,
                      background: "#d97706",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    Request & Block Account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* courses tab */}
          {tab === "courses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                className="teacher-detail-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  ["Courses", teacher.stats?.totalCourses ?? teacher.courses?.length ?? 0],
                  ["Students", teacher.stats?.totalStudents ?? 0],
                  ["Tests", teacher.stats?.totalTests ?? 0],
                  ["Completion", `${teacher.stats?.completionRate ?? 0}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding: "10px 12px",
                      background: "#f9fafb",
                      border: "1px solid #f3f4f6",
                      borderRadius: 10,
                    }}
                  >
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>{label}</p>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {teacher.courses?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {teacher.courses.map((course) => (
                    <div
                      key={course._id}
                      style={{
                        padding: "12px 14px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#fff",
                      }}
                    >
                      <div
                        className="teacher-detail-course-row"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {course.name}
                          </p>
                          <p style={{ fontSize: 11, color: "#9ca3af" }}>
                            {course.totalQuestions || 0} questions ·{" "}
                            {course.isPaid ? "Paid" : "Free"}
                          </p>
                        </div>
                        <Badge
                          {...(STATUS_CONFIG[course.approvalStatus] || {
                            label: course.approvalStatus,
                            color: "#6b7280",
                            bg: "#f9fafb",
                            border: "#e5e7eb",
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  No courses created yet.
                </p>
              )}
            </div>
          )}

          {/* actions tab */}
          {tab === "actions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: "16px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#991b1b",
                    marginBottom: 8,
                  }}
                >
                  Delete Teacher Account
                </p>
                <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 12 }}>
                  This permanently deletes the teacher account. Their courses
                  and uploaded documents will be deleted. A reason is required
                  and will be emailed to the teacher before deletion completes.
                </p>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for deleting this teacher account..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1.5px solid #fecaca",
                    borderRadius: 8,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                    fontFamily: "inherit",
                    marginBottom: 12,
                  }}
                />
                <button
                  onClick={handleDelete}
                  disabled={loading || deleteReason.trim().length < 10}
                  style={{
                    padding: "9px 20px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      loading || deleteReason.trim().length < 10
                        ? "not-allowed"
                        : "pointer",
                    opacity: deleteReason.trim().length < 10 ? 0.6 : 1,
                  }}
                >
                  Delete Account and Email Teacher
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// main component

const TeacherManagement = () => {
  const { adminRequest } = useAdmin();
  const [mainTab, setMainTab] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [emailEditorApp, setEmailEditorApp] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [appStatusFilter, setAppStatusFilter] = useState("pending");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRequest(
        "GET",
        `/teachers/applications?status=${appStatusFilter}&limit=50`,
      );
      setApplications(res.data.data.applications || []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [adminRequest, appStatusFilter]);

  const loadTeachers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 20 });
        if (search) params.append("search", search);
        const res = await adminRequest("GET", `/teachers/admin/all?${params}`);
        setTeachers(res.data.data.teachers);
        setPagination(res.data.data.pagination);
      } catch {
        toast.error("Failed to load teachers");
      } finally {
        setLoading(false);
      }
    },
    [adminRequest, search],
  );

  useEffect(() => {
    if (mainTab === "applications") loadApplications();
    else if (mainTab === "teachers") loadTeachers();
  }, [mainTab, loadApplications, loadTeachers]);

  const handleReject = async (appId) => {
    if (!window.confirm("Reject this application?")) return;
    try {
      await adminRequest("POST", "/teachers/applications/reject", {
        applicationId: appId,
      });
      toast.success("Application rejected");
      loadApplications();
    } catch {
      toast.error("Failed");
    }
  };

  const openTeacherDetails = async (teacher) => {
    setSelectedTeacher({ ...teacher, _detailsLoading: true });
    try {
      const res = await adminRequest("GET", `/teachers/admin/${teacher._id}`);
      setSelectedTeacher({
        ...res.data.data.teacher,
        courses: res.data.data.courses || [],
        stats: res.data.data.stats || {},
      });
    } catch {
      toast.error("Failed to load teacher details");
      setSelectedTeacher(teacher);
    }
  };

  const MAIN_TABS = [
    { id: "applications", label: "Applications" },
    { id: "teachers", label: "Registered Teachers" },
  ];

  return (
    <div
      className="teacher-admin-page"
      style={{
        padding: 24,
        fontFamily: "'Inter Variable', sans-serif",
        maxWidth: 1100,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Teacher Management
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          Manage teacher applications, invitations, and registered accounts
        </p>
      </div>

      {/* tab switcher */}
      <div
        className="teacher-admin-tabs"
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: `2px solid ${mainTab === t.id ? "#2563eb" : "transparent"}`,
              background: "none",
              fontSize: 14,
              fontWeight: mainTab === t.id ? 600 : 400,
              color: mainTab === t.id ? "#2563eb" : "#6b7280",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* applications tab */}
      {mainTab === "applications" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {["pending", "invited", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setAppStatusFilter(s)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: `1.5px solid ${appStatusFilter === s ? "#2563eb" : "#e5e7eb"}`,
                  background: appStatusFilter === s ? "#eff6ff" : "#fff",
                  color: appStatusFilter === s ? "#2563eb" : "#374151",
                  fontSize: 13,
                  fontWeight: appStatusFilter === s ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Loading...
            </div>
          ) : applications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              No {appStatusFilter} applications.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {applications.map((app) => (
                <motion.div
                  className="teacher-application-card"
                  key={app._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 2px 12px rgba(0,0,0,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow = "none")
                  }
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {app.name}
                      </h3>
                      <Badge
                        {...(STATUS_CONFIG[app.status] ||
                          STATUS_CONFIG.pending)}
                      />
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {countryName(app.country)} ·{" "}
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      {app.email}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#374151",
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Qualification:</strong> {app.qualification}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#374151",
                        marginTop: 4,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Reason:</strong>{" "}
                      {app.reason.length > 120
                        ? `${app.reason.slice(0, 120)}...`
                        : app.reason}
                    </p>
                    {app.inviteSentAt &&
                      (() => {
                        const sentAt = new Date(app.inviteSentAt);
                        const now = new Date();
                        const minutesSinceSent = (now - sentAt) / 1000 / 60;
                        // invite link expires in 4 minutes
                        const linkExpired = minutesSinceSent > 4;

                        return (
                          <div
                            style={{
                              marginTop: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                margin: 0,
                              }}
                            >
                              Invite sent: {sentAt.toLocaleString()}
                            </p>
                            {linkExpired && (
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                Link Expired
                              </span>
                            )}
                          </div>
                        );
                      })()}
                  </div>

                  {app.status === "pending" && (
                    <div
                      className="teacher-application-actions"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => setEmailEditorApp(app)}
                        style={{
                          padding: "8px 16px",
                          background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
                        }}
                      >
                        Send Invite
                      </button>
                      <button
                        onClick={() => handleReject(app._id)}
                        style={{
                          padding: "8px 16px",
                          background: "#fff",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {app.status === "invited" &&
                    (() => {
                      const sentAt = new Date(app.inviteSentAt);
                      const minutesSinceSent =
                        (new Date() - sentAt) / 1000 / 60;
                      const linkExpired = minutesSinceSent > 4;

                      return linkExpired ? (
                        <div
                          className="teacher-application-actions"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={async () => {
                              try {
                                await adminRequest(
                                  "POST",
                                  "/teachers/applications/reset",
                                  { applicationId: app._id },
                                );
                                // immediately open email editor with the application data
                                setEmailEditorApp({
                                  ...app,
                                  status: "pending",
                                });
                                toast.success(
                                  "Compose and send a new invite below",
                                );
                                // refresh list in background so count updates
                                loadApplications();
                              } catch (err) {
                                toast.error(
                                  err.response?.data?.message ||
                                    "Failed to reset",
                                );
                              }
                            }}
                            style={{
                              padding: "8px 14px",
                              background:
                                "linear-gradient(135deg, #d97706, #b45309)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              boxShadow: "0 2px 8px rgba(217,119,6,0.25)",
                            }}
                          >
                            Resend Invite
                          </button>
                          <button
                            onClick={() => handleReject(app._id)}
                            style={{
                              padding: "8px 14px",
                              background: "#fff",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Reject
                          </button>
                          <p
                            style={{
                              fontSize: 10,
                              color: "#9ca3af",
                              textAlign: "center",
                              margin: 0,
                            }}
                          >
                            Link expired
                          </p>
                        </div>
                      ) : (
                        <div
                          className="teacher-application-actions"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            alignItems: "flex-end",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: "#2563eb",
                              fontWeight: 600,
                              padding: "4px 10px",
                              background: "#eff6ff",
                              borderRadius: 20,
                              border: "1px solid #bfdbfe",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Invite Sent
                          </span>
                          <button
                            onClick={() => handleReject(app._id)}
                            style={{
                              padding: "7px 12px",
                              background: "#fff",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      );
                    })()}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* teachers tab */}
      {mainTab === "teachers" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadTeachers()}
              placeholder="Search by name, email, or username..."
              style={{
                width: "100%",
                maxWidth: 400,
                height: 42,
                padding: "0 14px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 14,
                color: "#111827",
                background: "#f9fafb",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              Loading...
            </div>
          ) : teachers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 14,
              }}
            >
              No teachers found.
            </div>
          ) : (
            <>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {teachers.map((t) => (
                  <motion.div
                    className="teacher-list-row"
                    key={t._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      transition: "box-shadow 0.15s",
                      cursor: "pointer",
                    }}
                    onClick={() => openTeacherDetails(t)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(0,0,0,0.06)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.boxShadow = "none")
                    }
                  >
                    {t.profileImage?.url ? (
                      <img
                        src={t.profileImage.url}
                        alt={t.name}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "2px solid #e5e7eb",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "#eff6ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#2563eb",
                          flexShrink: 0,
                        }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 3,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#111827",
                          }}
                        >
                          {t.name}
                        </p>
                        <Badge
                          {...(STATUS_CONFIG[t.documentStatus] ||
                            STATUS_CONFIG.not_uploaded)}
                        />
                        {t.accessBlocked && (
                          <Badge
                            label="Blocked"
                            color="#dc2626"
                            bg="#fef2f2"
                            border="#fecaca"
                          />
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "#9ca3af" }}>
                        @{t.username} · {t.email} ·{" "}
                        {countryName(t.country)}
                      </p>
                    </div>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </motion.div>
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "center",
                    marginTop: 20,
                  }}
                >
                  {Array.from({ length: pagination.totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => loadTeachers(i + 1)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: `1.5px solid ${pagination.page === i + 1 ? "#2563eb" : "#e5e7eb"}`,
                        background:
                          pagination.page === i + 1 ? "#eff6ff" : "#fff",
                        color:
                          pagination.page === i + 1 ? "#2563eb" : "#374151",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* modals */}
      <AnimatePresence>
        {emailEditorApp && (
          <EmailEditor
            application={emailEditorApp}
            onClose={() => setEmailEditorApp(null)}
            onSent={loadApplications}
          />
        )}
        {selectedTeacher && (
          <TeacherDetailModal
            teacher={selectedTeacher}
            onClose={() => setSelectedTeacher(null)}
            onRefresh={loadTeachers}
          />
        )}
      </AnimatePresence>
      <style>{`
        @media (max-width: 640px) {
          .teacher-admin-page {
            max-width: 100% !important;
            padding: 12px !important;
          }

          .teacher-admin-tabs {
            overflow-x: auto !important;
            margin-bottom: 16px !important;
            -webkit-overflow-scrolling: touch;
          }

          .teacher-admin-tabs button {
            flex: 1 0 auto !important;
            padding: 10px 12px !important;
            white-space: nowrap !important;
          }

          .teacher-application-card {
            flex-direction: column !important;
            padding: 14px !important;
          }

          .teacher-application-actions {
            width: 100% !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: stretch !important;
          }

          .teacher-application-actions button {
            flex: 1 1 140px !important;
            min-height: 40px !important;
          }

          .teacher-list-row {
            align-items: flex-start !important;
            padding: 14px !important;
          }

          .teacher-list-row > svg {
            margin-top: 12px !important;
            flex-shrink: 0 !important;
          }

          .teacher-admin-modal-backdrop {
            align-items: flex-start !important;
            padding: 12px !important;
            overflow-y: auto !important;
          }

          .teacher-admin-modal-panel {
            max-width: calc(100vw - 24px) !important;
            max-height: calc(100dvh - 24px) !important;
            border-radius: 14px !important;
          }

          .teacher-admin-modal-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 16px !important;
            position: sticky !important;
          }

          .teacher-admin-modal-header > button {
            position: absolute !important;
            right: 12px !important;
            top: 12px !important;
          }

          .teacher-admin-modal-controls {
            width: 100% !important;
            flex-wrap: wrap !important;
            padding-right: 38px !important;
          }

          .teacher-admin-modal-controls button {
            flex: 1 1 auto !important;
          }

          .teacher-admin-email-body {
            flex-direction: column !important;
          }

          .teacher-admin-email-editor,
          .teacher-detail-body {
            padding: 16px !important;
          }

          .teacher-admin-design-panel {
            width: 100% !important;
            border-left: 0 !important;
            border-top: 1px solid #f1f5f9 !important;
          }

          .teacher-admin-modal-footer {
            align-items: stretch !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 14px 16px !important;
          }

          .teacher-admin-modal-footer > div {
            display: flex !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .teacher-admin-modal-footer button {
            flex: 1 !important;
          }

          .teacher-detail-identity {
            align-items: flex-start !important;
            padding-right: 36px !important;
          }

          .teacher-detail-tabs {
            overflow-x: auto !important;
            padding: 0 12px !important;
            -webkit-overflow-scrolling: touch;
          }

          .teacher-detail-tabs button {
            flex: 1 0 auto !important;
            padding: 12px !important;
          }

          .teacher-detail-overview-grid {
            grid-template-columns: 1fr !important;
          }

          .teacher-detail-doc-actions {
            flex-direction: column !important;
          }

          .teacher-detail-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .teacher-detail-course-row > div {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 420px) {
          .teacher-detail-stats-grid {
            grid-template-columns: 1fr !important;
          }

          .teacher-admin-modal-footer > div {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherManagement;
