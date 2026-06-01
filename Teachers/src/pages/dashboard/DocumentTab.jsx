import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTeacher } from "../../context/TeacherContext.jsx";
import { teacherApi } from "../../services/api.js";
import toast from "react-hot-toast";

const statusConfig = {
  not_uploaded: {
    label: "Not uploaded",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
  pending: {
    label: "Under review",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  verified: {
    label: "Verified",
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
};

const DocumentsTab = () => {
  const { teacher, updateTeacher } = useTeacher();
  const [files, setFiles] = useState([null, null]);
  const [previews, setPreviews] = useState([null, null]);
  const [loading, setLoading] = useState(false);
  const fileRefs = [useRef(), useRef()];

  const docStatus = teacher?.documentStatus || "not_uploaded";
  const statusDisplay = statusConfig[docStatus];
  const isBlocked = teacher?.accessBlocked;

  const handleFileChange = (idx, file) => {
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Only PDF, JPEG, PNG files allowed");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error(`Document ${idx + 1} must be under 1MB`);
      return;
    }

    const newFiles = [...files];
    newFiles[idx] = file;
    setFiles(newFiles);

    const newPreviews = [...previews];
    if (file.type.startsWith("image/")) {
      newPreviews[idx] = URL.createObjectURL(file);
    } else {
      newPreviews[idx] = "pdf";
    }
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    const validFiles = files.filter(Boolean);
    if (validFiles.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => {
        if (f) formData.append("documents", f);
      });

      await teacherApi.profile.uploadDocuments(formData);
      updateTeacher({ documentStatus: "pending" });
      toast.success("Documents uploaded successfully");
      setFiles([null, null]);
      setPreviews([null, null]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-narrow-tab teacher-documents-tab" style={{ maxWidth: 760 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
        }}
      >
        Verification Documents
      </h2>
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>
        Upload proof of your teaching credentials. Max 1MB per file. PDF, JPEG,
        or PNG.
      </p>

      {/* status banner */}
      <div
        style={{
          padding: "14px 16px",
          background: statusDisplay.bg,
          border: `1px solid ${statusDisplay.border}`,
          borderRadius: 12,
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: statusDisplay.color,
            marginTop: 3,
            flexShrink: 0,
          }}
        />
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: statusDisplay.color,
            }}
          >
            {statusDisplay.label}
          </p>
          {docStatus === "not_uploaded" && (
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              Upload your documents below.
            </p>
          )}
          {docStatus === "pending" && (
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              Your documents are under review. This usually takes 24–48 hours.
            </p>
          )}
          {docStatus === "verified" && (
            <p
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              Your identity has been verified. All features are unlocked.
            </p>
          )}
          {docStatus === "rejected" && teacher?.documentRejectionReason && (
            <p
              style={{
                fontSize: 12,
                color: "#dc2626",
                marginTop: 3,
                lineHeight: 1.5,
              }}
            >
              Reason: {teacher.documentRejectionReason}. Please upload corrected
              documents.
            </p>
          )}
        </div>
      </div>

      {/* blocked warning */}
      {isBlocked && (
        <div
          style={{
            padding: "14px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#dc2626",
              marginBottom: 4,
            }}
          >
            Account Access Restricted
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            {teacher?.accessBlockReason ||
              "Your account has been restricted by admin. Please upload the required verification documents to restore access."}
          </p>
          {teacher?.documentRequestNote && (
            <p
              style={{
                fontSize: 12,
                color: "#374151",
                marginTop: 8,
                padding: "8px 10px",
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #fecaca",
              }}
            >
              <strong>Admin note:</strong> {teacher.documentRequestNote}
            </p>
          )}
        </div>
      )}

      {/* upload slots */}
      {(docStatus !== "verified" || docStatus === "rejected") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[0, 1].map((idx) => (
            <div key={idx}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 8,
                }}
              >
                Document {idx + 1}
                {idx === 0 ? " (Required)" : " (Optional)"}
              </p>
              <div
                onClick={() => fileRefs[idx].current?.click()}
                style={{
                  border: `2px dashed ${files[idx] ? "#2563eb" : "#e2e8f0"}`,
                  borderRadius: 12,
                  padding: "20px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: files[idx] ? "#eff6ff" : "#f8fafc",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {previews[idx] === "pdf" ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: "#fee2e2",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {files[idx]?.name}
                      </p>
                      <p style={{ fontSize: 11, color: "#6b7280" }}>
                        {(files[idx]?.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : previews[idx] ? (
                  <img
                    src={previews[idx]}
                    alt=""
                    style={{
                      maxHeight: 120,
                      maxWidth: "100%",
                      borderRadius: 8,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <>
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      style={{ margin: "0 auto 8px" }}
                    >
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
                    </svg>
                    <p style={{ fontSize: 13, color: "#64748b" }}>
                      <span style={{ color: "#2563eb", fontWeight: 600 }}>
                        Click
                      </span>{" "}
                      to select
                    </p>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                      PDF, JPEG, PNG · Max 1MB
                    </p>
                  </>
                )}

                {files[idx] && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const n = [...files];
                      n[idx] = null;
                      setFiles(n);
                      const p = [...previews];
                      p[idx] = null;
                      setPreviews(p);
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#ef4444",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                ref={fileRefs[idx]}
                type="file"
                accept=".pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => handleFileChange(idx, e.target.files[0])}
                style={{ display: "none" }}
              />
            </div>
          ))}

          <motion.button
            onClick={handleUpload}
            disabled={loading || !files[0]}
            whileHover={{ scale: loading || !files[0] ? 1 : 1.01 }}
            whileTap={{ scale: loading || !files[0] ? 1 : 0.98 }}
            style={{
              height: 46,
              background:
                loading || !files[0]
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: loading || !files[0] ? "#94a3b8" : "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !files[0] ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
              boxShadow:
                !loading && files[0]
                  ? "0 4px 14px rgba(37,99,235,0.25)"
                  : "none",
            }}
          >
            {loading ? (
              <>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                Uploading...
              </>
            ) : (
              "Upload Documents"
            )}
          </motion.button>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default DocumentsTab;
