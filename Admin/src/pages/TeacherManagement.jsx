import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdmin } from "../context/AdminContext";
import toast from "react-hot-toast";

// ── helpers ──

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

// Email template presets
const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    label: "Standard Welcome",
    subject: "You're invited to teach on Vidhgrow",
    body: `We've reviewed your application and we're excited to invite you to join Vidhgrow as a teacher!

Your expertise and passion for education will be a great addition to our platform. As a teacher, you'll:

- Keep 80% of every course sale
- Reach thousands of motivated students
- Create courses with full control over pricing and content
- Receive fast payouts via Razorpay (India) or Khalti (Nepal)

Click the button below to complete your registration. The link expires in 4 minutes, so please register promptly.

We look forward to having you on board!

Warm regards,
The Vidhgrow Team`,
  },
  {
    id: "qualified",
    label: "Highly Qualified",
    subject: "Exclusive invitation to teach on Vidhgrow",
    body: `Congratulations! After carefully reviewing your impressive qualifications and application, we're thrilled to extend you an exclusive invitation to join Vidhgrow as a featured teacher.

Your background and expertise are exactly what our students are looking for. We believe your courses will make a significant impact.

As a Vidhgrow teacher you'll keep 80% of every sale, with payouts processed directly to your bank or digital wallet.

Please complete your registration using the link below. It expires in 4 minutes.

Looking forward to working with you,
The Vidhgrow Team`,
  },
  {
    id: "custom",
    label: "Custom",
    subject: "",
    body: "",
  },
];

// ── components ──

const EmailEditor = ({ application, onClose, onSent }) => {
  const { adminRequest } = useAdmin();
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES[0].body);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const applyTemplate = (idx) => {
    setSelectedTemplate(idx);
    if (EMAIL_TEMPLATES[idx].id !== "custom") {
      setSubject(EMAIL_TEMPLATES[idx].subject);
      setBody(EMAIL_TEMPLATES[idx].body);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body required");
      return;
    }
    setSending(true);
    try {
      await adminRequest("POST", "/api/teachers/applications/invite", {
        applicationId: application._id,
        emailSubject: subject,
        emailContent: body,
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Send Invite Email
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              To: <strong>{application.name}</strong> ({application.email}) ·{" "}
              {application.country === "india" ? "🇮🇳 India" : "🇳🇵 Nepal"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPreview((p) => !p)}
              style={{
                padding: "7px 14px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: preview ? "#f3f4f6" : "#fff",
                color: "#374151",
              }}
            >
              {preview ? "Edit" : "Preview"}
            </button>
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
        </div>

        <div style={{ padding: 24 }}>
          {/* template selector */}
          {!preview && (
            <div style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Templates
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EMAIL_TEMPLATES.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(i)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${selectedTemplate === i ? "#2563eb" : "#e5e7eb"}`,
                      background: selectedTemplate === i ? "#eff6ff" : "#fff",
                      color: selectedTemplate === i ? "#2563eb" : "#374151",
                      fontSize: 13,
                      fontWeight: selectedTemplate === i ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s",
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
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: 13,
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
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {body}
                </p>
                <div
                  style={{
                    marginTop: 24,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "12px 28px",
                      background: "#2563eb",
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
                    marginTop: 16,
                    fontSize: 12,
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  Link expires in 4 minutes
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* subject */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: "100%",
                    height: 44,
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

              {/* body */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Email Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 10,
                    fontSize: 14,
                    color: "#111827",
                    background: "#f9fafb",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                    lineHeight: 1.7,
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  The registration link is automatically appended.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            position: "sticky",
            bottom: 0,
            background: "#fff",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              border: "1.5px solid #e5e7eb",
              borderRadius: 9,
              fontSize: 14,
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
              fontSize: 14,
              fontWeight: 600,
              cursor: sending ? "not-allowed" : "pointer",
              background: sending
                ? "#93c5fd"
                : "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: sending ? "none" : "0 3px 10px rgba(37,99,235,0.25)",
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
              "Send Invite"
            )}
          </button>
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
  const [loading, setLoading] = useState(false);

  const handleVerifyDocs = async (approved) => {
    setLoading(true);
    try {
      await adminRequest("POST", "/api/teachers/admin/verify-documents", {
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
      await adminRequest("POST", "/api/teachers/admin/request-documents", {
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
    if (
      !window.confirm(`Delete teacher ${teacher.name}? This cannot be undone.`)
    )
      return;
    setLoading(true);
    try {
      await adminRequest("DELETE", `/api/teachers/admin/${teacher._id}`);
      toast.success("Teacher deleted");
      onRefresh();
      onClose();
    } catch {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const TABS = ["overview", "documents", "courses", "actions"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
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
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
                {teacher.country === "india" ? "🇮🇳" : "🇳🇵"} {teacher.email}
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

        <div style={{ padding: 24 }}>
          {/* overview tab */}
          {tab === "overview" && (
            <div
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
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
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
            <p
              style={{
                color: "#9ca3af",
                fontSize: 13,
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              Course list visible in Courses panel. Filter by teacher name to
              see their submissions.
            </p>
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
                  will be unassigned (not deleted). This cannot be undone.
                </p>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{
                    padding: "9px 20px",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── main component ──

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
        `/api/teachers/applications?status=${appStatusFilter}&limit=50`,
      );
      setApplications(res.data.data.applications);
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
        const res = await adminRequest(
          "GET",
          `/api/teachers/admin/all?${params}`,
        );
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
      await adminRequest("POST", "/api/teachers/applications/reject", {
        applicationId: appId,
      });
      toast.success("Application rejected");
      loadApplications();
    } catch {
      toast.error("Failed");
    }
  };

  const MAIN_TABS = [
    { id: "applications", label: "Applications" },
    { id: "teachers", label: "Registered Teachers" },
  ];

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "'Inter Variable', sans-serif",
        maxWidth: 1100,
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
                        {app.country === "india" ? "🇮🇳" : "🇳🇵"} ·{" "}
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
                    {app.inviteSentAt && (
                      <p
                        style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}
                      >
                        Invite sent:{" "}
                        {new Date(app.inviteSentAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {app.status === "pending" && (
                    <div
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
                    onClick={() => setSelectedTeacher(t)}
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
                        {t.country === "india" ? "🇮🇳" : "🇳🇵"}
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
    </div>
  );
};

export default TeacherManagement;
