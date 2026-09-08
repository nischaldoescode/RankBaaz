/**
 * renders the teacher dashboard profile tab with data loading, actions, forms, and mobile states
 *
 * @file teachers/src/pages/dashboard/profiletab.jsx
 * @module teachers/src/pages/dashboard/profiletab
 * @exports route component rendered by the client router
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useTeacher } from "../../context/TeacherContext.jsx";
import { teacherApi } from "../../services/api.js";
import toast from "react-hot-toast";

const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 14px",
  border: "1.5px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  background: "#f8fafc",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const dicebearUrl = (seed) =>
  `https://api.dicebear.com/9.x/croodles-neutral/svg?seed=${encodeURIComponent(seed)}`;

const frontendUrl = (
  import.meta.env.VITE_FRONTEND_URL || "https://vidhgrow.online"
).replace(/\/+$/, "");

const getPublicProfileUrl = (username) => {
  const normalizedUsername = String(username || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();

  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) return null;

  return `${frontendUrl}/teacher/${encodeURIComponent(normalizedUsername)}`;
};

const ProfileTab = () => {
  const { teacher, updateTeacher } = useTeacher();
  const fallbackAvatar = useMemo(
    () => dicebearUrl(teacher?.username || teacher?.name || "teacher"),
    [teacher?.name, teacher?.username],
  );
  const savedAvatar = teacher?.profileImage?.url || fallbackAvatar;
  const publicProfileUrl = getPublicProfileUrl(teacher?.username);
  const publicProfileAvailable =
    teacher?.documentStatus === "verified" &&
    teacher?.isActive !== false &&
    teacher?.accessBlocked !== true;
  const [form, setForm] = useState({
    bio: teacher?.bio || "",
    qualification: teacher?.qualification || "",
    showQualification: teacher?.showQualification !== false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(savedAvatar);
  const [objectPreviewUrl, setObjectPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!imageFile) setImagePreview(savedAvatar);
  }, [imageFile, savedAvatar]);

  useEffect(
    () => () => {
      if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    },
    [objectPreviewUrl],
  );

  const handleImageChange = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images allowed");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Image must be under 1MB");
      return;
    }
    const nextPreview = URL.createObjectURL(file);
    if (objectPreviewUrl) URL.revokeObjectURL(objectPreviewUrl);
    setImageFile(file);
    setObjectPreviewUrl(nextPreview);
    setImagePreview(nextPreview);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleSave = async () => {
    const cleanBio = form.bio.trim();
    const cleanQualification = form.qualification.trim();

    if (cleanBio.length > 500) {
      toast.error("Bio must be 500 characters or less");
      return;
    }

    if (cleanQualification.length > 300) {
      toast.error("Qualification must be 300 characters or less");
      return;
    }

    setLoading(true);
    try {
      let payload;

      if (imageFile) {
        payload = new FormData();
        payload.append("bio", cleanBio);
        payload.append("qualification", cleanQualification);
        payload.append("showQualification", form.showQualification ? "true" : "false");
        payload.append("profileImage", imageFile);
      } else {
        payload = {
          bio: cleanBio,
          qualification: cleanQualification,
          showQualification: form.showQualification,
        };
      }

      const res = await teacherApi.profile.update(payload);
      const updatedTeacher = res.data.data.teacher;
      updateTeacher(updatedTeacher);
      setForm({
        bio: updatedTeacher?.bio || "",
        qualification: updatedTeacher?.qualification || "",
        showQualification: updatedTeacher?.showQualification !== false,
      });
      setImageFile(null);
      if (fileRef.current) fileRef.current.value = "";
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
        setObjectPreviewUrl(null);
      }
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    form.bio !== (teacher?.bio || "") ||
    form.qualification !== (teacher?.qualification || "") ||
    form.showQualification !== (teacher?.showQualification !== false) ||
    imageFile !== null;

  return (
    <div className="teacher-narrow-tab teacher-profile-tab" style={{ maxWidth: 760 }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Public Profile
        </h2>
        {publicProfileUrl && publicProfileAvailable ? (
          <a
            href={publicProfileUrl}
            className="teacher-public-profile-link"
            aria-label={`View the public profile for ${teacher?.name || "this teacher"}`}
            title="Open your public profile"
          >
            <ExternalLink size={15} aria-hidden="true" />
            View public profile
          </a>
        ) : (
          <span
            style={{
              color: "#94a3b8",
              fontSize: 12,
              lineHeight: 1.4,
              maxWidth: 260,
              textAlign: "right",
            }}
          >
            Available after your teacher profile is verified
          </span>
        )}
      </header>
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28 }}>
        This is what students see on your teacher profile page.
      </p>

      {/* image upload */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #f1f5f9",
          borderRadius: 16,
          padding: "24px",
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 16 }}>
          Profile Photo
        </p>

        <div className="teacher-profile-photo-row" style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          {/* preview */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            {imageFile && (
              <button
                onClick={() => {
                  setImagePreview(savedAvatar);
                  if (objectPreviewUrl) {
                    URL.revokeObjectURL(objectPreviewUrl);
                    setObjectPreviewUrl(null);
                  }
                  setImageFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "2px solid #fff",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              flex: 1,
              minWidth: 200,
              border: `2px dashed ${isDragging ? "#2563eb" : "#e2e8f0"}`,
              borderRadius: 12,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              background: isDragging ? "#eff6ff" : "#f8fafc",
              transition: "all 0.2s",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ margin: "0 auto 8px" }}>
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
            </svg>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              <span style={{ color: "#2563eb", fontWeight: 600 }}>Click to upload</span> or drag & drop
            </p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              JPG, PNG, WebP · Max 1MB
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => handleImageChange(e.target.files[0])}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* info card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #f1f5f9",
          borderRadius: 16,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* read-only info */}
        <div
          className="teacher-profile-info-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "14px",
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #f1f5f9",
          }}
        >
          {[
            { label: "Name", value: teacher?.name },
            { label: "Username", value: `@${teacher?.username}` },
            { label: "Email", value: teacher?.email },
            { label: "Country", value: teacher?.country === "india" ? "India" : "Nepal" },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{item.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* bio */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            Bio
          </label>
          <textarea
            style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical" }}
            rows={4}
            maxLength={500}
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell students about your teaching experience and expertise..."
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 4 }}>
            {form.bio.length}/500
          </p>
        </div>

        {/* qualification */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
            Qualification
          </label>
          <textarea
            style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical" }}
            rows={3}
            maxLength={300}
            value={form.qualification}
            onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
            placeholder="Degrees, certifications, years of experience..."
            onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#f8fafc",
            cursor: "pointer",
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Show qualification publicly
            </p>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Control whether this appears on your public teacher page.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.showQualification}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                showQualification: e.target.checked,
              }))
            }
            style={{ width: 18, height: 18, flexShrink: 0 }}
          />
        </label>

        <motion.button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          whileHover={{ scale: loading || !hasChanges ? 1 : 1.01 }}
          whileTap={{ scale: loading || !hasChanges ? 1 : 0.98 }}
          style={{
            height: 44,
            background:
              loading || !hasChanges
                ? "#e2e8f0"
                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: loading || !hasChanges ? "#94a3b8" : "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading || !hasChanges ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: loading || !hasChanges ? "none" : "0 4px 14px rgba(37,99,235,0.25)",
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
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </motion.button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ProfileTab;
