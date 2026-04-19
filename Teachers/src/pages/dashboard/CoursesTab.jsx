import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { teacherApi } from "../../services/api.js";
import { useTeacher } from "../../context/TeacherContext.jsx";
import toast from "react-hot-toast";

const DICEBEAR = (seed) =>
  `https://api.dicebear.com/9.x/croodles-neutral/svg?seed=${encodeURIComponent(seed)}`;

// ── small components ──

const btn = (extra = "") =>
  `inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${extra}`;

const inputS = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: "1.5px solid #e2e8f0",
  borderRadius: 9,
  fontSize: 13,
  color: "#0f172a",
  background: "#f8fafc",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.2s",
};

const focus = (e) => (e.target.style.borderColor = "#2563eb");
const blur = (e) => (e.target.style.borderColor = "#e2e8f0");

// ── question type badge ──
const QTypeBadge = ({ type }) => {
  const map = {
    multiple: { label: "MCQ", bg: "#eff6ff", color: "#2563eb" },
    single: { label: "Short", bg: "#f0fdf4", color: "#16a34a" },
    truefalse: { label: "T/F", bg: "#faf5ff", color: "#7c3aed" },
  };
  const s = map[type] || map.multiple;
  return (
    <span
      style={{
        padding: "1px 7px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
};

// ── coupon row ──
const CouponRow = ({ coupon, onToggle, onDelete }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      background: "#f8fafc",
      borderRadius: 10,
      border: "1px solid #f1f5f9",
      flexWrap: "wrap",
    }}
  >
    <code
      style={{
        fontFamily: "monospace",
        fontWeight: 700,
        fontSize: 13,
        color: "#7c3aed",
        background: "#faf5ff",
        padding: "2px 8px",
        borderRadius: 6,
        border: "1px solid #e9d5ff",
      }}
    >
      {coupon.code}
    </code>
    <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>
      {coupon.discount}% OFF
    </span>
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 20,
        background: coupon.isActive ? "#f0fdf4" : "#f9fafb",
        color: coupon.isActive ? "#16a34a" : "#6b7280",
        border: `1px solid ${coupon.isActive ? "#bbf7d0" : "#e5e7eb"}`,
        fontWeight: 600,
      }}
    >
      {coupon.isActive ? "Active" : "Inactive"}
    </span>
    <span style={{ fontSize: 11, color: "#94a3b8" }}>
      Used {coupon.usageCount} times
      {coupon.maxUsage ? ` / ${coupon.maxUsage}` : ""}
    </span>
    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
      <button
        onClick={() => onToggle(coupon._id, coupon.isActive)}
        style={{
          padding: "4px 10px",
          borderRadius: 7,
          border: "1px solid #e5e7eb",
          background: "#fff",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          color: "#374151",
        }}
      >
        {coupon.isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={() => onDelete(coupon._id)}
        style={{
          padding: "4px 8px",
          borderRadius: 7,
          border: "1px solid #fecaca",
          background: "#fff5f5",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          color: "#dc2626",
        }}
      >
        Delete
      </button>
    </div>
  </div>
);

// ── add coupon form ──
const AddCouponForm = ({ courseId, onCreated, onCancel }) => {
  const [form, setForm] = useState({
    code: "",
    discount: "10",
    maxUsage: "",
    validUntil: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || form.code.length < 4) {
      toast.error("Code must be 4+ chars");
      return;
    }
    setLoading(true);
    try {
      await teacherApi.coupons.create({
        courseId,
        code: form.code.toUpperCase(),
        discount: parseInt(form.discount),
        maxUsage: form.maxUsage ? parseInt(form.maxUsage) : null,
        validUntil: form.validUntil || null,
      });
      toast.success("Coupon created");
      onCreated();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed";
      if (err.response?.data?.code === "COUPON_ACCESS_DENIED") {
        toast.error("Admin has not granted coupon access to you yet.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 14,
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            Code *
          </label>
          <input
            style={{
              ...inputS,
              height: 38,
              fontFamily: "monospace",
              letterSpacing: "0.08em",
            }}
            value={form.code}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              }))
            }
            placeholder="SAVE20"
            maxLength={20}
            required
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            Discount *
          </label>
          <select
            style={{ ...inputS, height: 38, cursor: "pointer" }}
            value={form.discount}
            onChange={(e) =>
              setForm((p) => ({ ...p, discount: e.target.value }))
            }
            onFocus={focus}
            onBlur={blur}
          >
            {[2, 5, 10, 15, 20].map((d) => (
              <option key={d} value={d}>
                {d}% OFF
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            Max Uses
          </label>
          <input
            type="number"
            style={{ ...inputS, height: 38 }}
            value={form.maxUsage}
            onChange={(e) =>
              setForm((p) => ({ ...p, maxUsage: e.target.value }))
            }
            placeholder="Unlimited"
            min={1}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            Expires
          </label>
          <input
            type="date"
            style={{ ...inputS, height: 38 }}
            value={form.validUntil}
            onChange={(e) =>
              setForm((p) => ({ ...p, validUntil: e.target.value }))
            }
            min={new Date().toISOString().split("T")[0]}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            height: 36,
            border: "1.5px solid #e2e8f0",
            borderRadius: 9,
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            color: "#475569",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 2,
            height: 36,
            border: "none",
            borderRadius: 9,
            background: loading
              ? "#93c5fd"
              : "linear-gradient(135deg,#2563eb,#1d4ed8)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Coupon"}
        </button>
      </div>
    </form>
  );
};

// ── add question modal ──
const AddQuestionModal = ({
  courseId,
  difficulty,
  marksPerQuestion,
  onClose,
  onAdded,
}) => {
  const [form, setForm] = useState({
    question: "",
    questionType: "multiple",
    options: ["", "", "", ""],
    correctAnswerIndex: 0,
    singleAnswer: "",
    truefalseAnswer: 0,
    explanation: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.question.trim().length < 10) {
      toast.error("Question min 10 chars");
      return;
    }
    if (form.explanation.trim().length < 10) {
      toast.error("Explanation min 10 chars");
      return;
    }
    if (
      form.questionType === "multiple" &&
      form.options.some((o) => !o.trim())
    ) {
      toast.error("Fill all options");
      return;
    }
    if (form.questionType === "single" && !form.singleAnswer.trim()) {
      toast.error("Answer required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        difficulty,
        question: form.question.trim(),
        explanation: form.explanation.trim(),
        questionType: form.questionType,
      };

      if (form.questionType === "multiple") {
        payload.options = form.options;
        payload.correctAnswerIndex = form.correctAnswerIndex;
      } else if (form.questionType === "single") {
        payload.correctAnswer = form.singleAnswer.trim();
      } else if (form.questionType === "truefalse") {
        payload.options = ["True", "False"];
        payload.correctAnswerIndex = form.truefalseAnswer;
      }

      await teacherApi.courses.addQuestion(courseId, payload);
      toast.success("Question added");
      onAdded();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed";
      if (
        err.response?.status === 403 &&
        err.response?.data?.code === "ACCESS_BLOCKED"
      ) {
        toast.error("Account blocked. Upload documents first.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "24px 22px",
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Add Question
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {difficulty} · {marksPerQuestion} marks
            </p>
          </div>
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

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* type selector */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Question Type
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 8,
              }}
            >
              {["multiple", "single", "truefalse"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, questionType: t }))}
                  style={{
                    padding: "8px 4px",
                    borderRadius: 9,
                    border: `1.5px solid ${form.questionType === t ? "#2563eb" : "#e2e8f0"}`,
                    background: form.questionType === t ? "#eff6ff" : "#fff",
                    color: form.questionType === t ? "#2563eb" : "#475569",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {t === "multiple"
                    ? "MCQ"
                    : t === "single"
                      ? "Short Answer"
                      : "True/False"}
                </button>
              ))}
            </div>
          </div>

          {/* question */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Question *
            </label>
            <textarea
              style={{
                ...inputS,
                height: "auto",
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.5,
              }}
              rows={3}
              value={form.question}
              onChange={(e) =>
                setForm((p) => ({ ...p, question: e.target.value }))
              }
              placeholder="Enter question text (min 10 chars)..."
              required
              onFocus={focus}
              onBlur={blur}
            />
            <p
              style={{
                fontSize: 11,
                color:
                  form.question.length < 10 && form.question.length > 0
                    ? "#dc2626"
                    : "#94a3b8",
                marginTop: 3,
              }}
            >
              {form.question.length}/1000
            </p>
          </div>

          {/* answer */}
          {form.questionType === "multiple" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Options (select correct)
              </label>
              {form.options.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <input
                    type="radio"
                    checked={form.correctAnswerIndex === i}
                    onChange={() =>
                      setForm((p) => ({ ...p, correctAnswerIndex: i }))
                    }
                    style={{ flexShrink: 0 }}
                  />
                  <input
                    style={{ ...inputS, height: 36, flex: 1 }}
                    value={opt}
                    onChange={(e) => {
                      const o = [...form.options];
                      o[i] = e.target.value;
                      setForm((p) => ({ ...p, options: o }));
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    onFocus={focus}
                    onBlur={blur}
                  />
                </div>
              ))}
            </div>
          )}

          {form.questionType === "single" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Correct Answer *
              </label>
              <input
                style={inputS}
                value={form.singleAnswer}
                onChange={(e) =>
                  setForm((p) => ({ ...p, singleAnswer: e.target.value }))
                }
                placeholder="The correct answer..."
                required
                onFocus={focus}
                onBlur={blur}
              />
            </div>
          )}

          {form.questionType === "truefalse" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Correct Answer
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {["True", "False"].map((val, i) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, truefalseAnswer: i }))
                    }
                    style={{
                      padding: "10px",
                      borderRadius: 9,
                      border: `1.5px solid ${form.truefalseAnswer === i ? (i === 0 ? "#16a34a" : "#dc2626") : "#e2e8f0"}`,
                      background:
                        form.truefalseAnswer === i
                          ? i === 0
                            ? "#f0fdf4"
                            : "#fef2f2"
                          : "#fff",
                      color:
                        form.truefalseAnswer === i
                          ? i === 0
                            ? "#16a34a"
                            : "#dc2626"
                          : "#475569",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {val === "True" ? "✅ True" : "❌ False"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* explanation */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Explanation *
            </label>
            <textarea
              style={{
                ...inputS,
                height: "auto",
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.5,
              }}
              rows={2}
              value={form.explanation}
              onChange={(e) =>
                setForm((p) => ({ ...p, explanation: e.target.value }))
              }
              placeholder="Why is this the correct answer? (min 10 chars)"
              required
              onFocus={focus}
              onBlur={blur}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: 40,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                height: 40,
                border: "none",
                borderRadius: 9,
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Adding..." : "Add Question"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── create course modal ──
const CreateCourseModal = ({ teacher, onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    isPaid: "false",
    price: "",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Max image size 5MB");
      return;
    }
    setImage(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Course name required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description required");
      return;
    }
    if (
      form.isPaid === "true" &&
      (!form.price || parseFloat(form.price) <= 0)
    ) {
      toast.error("Price required for paid courses");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("isPaid", form.isPaid);
      if (form.isPaid === "true") fd.append("price", form.price);
      if (image) fd.append("image", image);

      // default difficulty settings
      fd.append(
        "difficulties",
        JSON.stringify([
          {
            name: "Easy",
            marksPerQuestion: 5,
            maxQuestions: 10,
            timerSettings: { minTime: 30, maxTime: 60 },
          },
          {
            name: "Medium",
            marksPerQuestion: 7,
            maxQuestions: 7,
            timerSettings: { minTime: 45, maxTime: 90 },
          },
          {
            name: "Hard",
            marksPerQuestion: 10,
            maxQuestions: 5,
            timerSettings: { minTime: 60, maxTime: 120 },
          },
        ]),
      );

      const res = await teacherApi.courses.create(fd);
      toast.success("Course created");
      onCreated(res.data.data.course);
      onClose();
    } catch (err) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.code === "ACCESS_BLOCKED"
      ) {
        toast.error("Account blocked. Upload verification documents first.");
      } else {
        toast.error(err.response?.data?.message || "Failed to create course");
      }
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = teacher?.country === "nepal" ? "रू (NPR)" : "₹ (INR)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px 16px",
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#fff",
          borderRadius: 18,
          padding: "26px 24px",
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              Create Course
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Goes live immediately after creation
            </p>
          </div>
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

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Course Name *
            </label>
            <input
              style={inputS}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Introduction to Mathematics"
              required
              onFocus={focus}
              onBlur={blur}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Description *
            </label>
            <textarea
              style={{
                ...inputS,
                height: "auto",
                padding: "10px 12px",
                resize: "vertical",
                lineHeight: 1.5,
              }}
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="What will students learn?"
              required
              onFocus={focus}
              onBlur={blur}
            />
          </div>

          {/* course image */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Course Image
            </label>
            {imagePreview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={imagePreview}
                  alt=""
                  style={{
                    width: "100%",
                    height: 140,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1.5px solid #e2e8f0",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "block",
                  border: "2px dashed #e2e8f0",
                  borderRadius: 10,
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#2563eb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#e2e8f0")
                }
              >
                <p style={{ fontSize: 13, color: "#64748b" }}>
                  Click to upload image
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                  PNG, JPG up to 5MB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>

          {/* paid/free */}
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Course Type
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {["false", "true"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      isPaid: v,
                      price: v === "false" ? "" : p.price,
                    }))
                  }
                  style={{
                    padding: "10px",
                    borderRadius: 9,
                    border: `1.5px solid ${form.isPaid === v ? "#2563eb" : "#e2e8f0"}`,
                    background: form.isPaid === v ? "#eff6ff" : "#fff",
                    color: form.isPaid === v ? "#2563eb" : "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {v === "false" ? "🆓 Free" : "💰 Paid"}
                </button>
              ))}
            </div>
          </div>

          {form.isPaid === "true" && (
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                style={inputS}
                value={form.price}
                onChange={(e) =>
                  setForm((p) => ({ ...p, price: e.target.value }))
                }
                placeholder="299"
                min="1"
                required
                onFocus={focus}
                onBlur={blur}
              />
              {teacher?.country === "nepal" && (
                <p style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>
                  🇳🇵 This course will be Nepal-only (Khalti payment)
                </p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: 42,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                height: 42,
                border: "none",
                borderRadius: 9,
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ── main CoursesTab ──

const CoursesTab = () => {
  const { teacher } = useTeacher();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [questions, setQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState({});
  const [coupons, setCoupons] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(null); // { courseId, difficulty, marksPerQuestion }
  const [addingCoupon, setAddingCoupon] = useState(null); // courseId
  const [expandedDiff, setExpandedDiff] = useState({}); // { courseId: difficulty }

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherApi.courses.getAll();
      setCourses(res.data.data?.courses || []);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleExpand = useCallback(
    async (courseId) => {
      if (expandedId === courseId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(courseId);

      // load questions
      if (!questions[courseId]) {
        setQuestionsLoading((p) => ({ ...p, [courseId]: true }));
        try {
          const res = await teacherApi.courses.getQuestions(courseId);
          setQuestions((p) => ({
            ...p,
            [courseId]: res.data.data.questions || [],
          }));
        } catch {
          toast.error("Failed to load questions");
        } finally {
          setQuestionsLoading((p) => ({ ...p, [courseId]: false }));
        }
      }

      // load coupons
      if (!coupons[courseId]) {
        try {
          const res = await teacherApi.coupons.getByCourse(courseId);
          setCoupons((p) => ({
            ...p,
            [courseId]: res.data.data.coupons || [],
          }));
        } catch {}
      }
    },
    [expandedId, questions, coupons],
  );

  const refreshQuestions = async (courseId) => {
    try {
      const res = await teacherApi.courses.getQuestions(courseId);
      setQuestions((p) => ({
        ...p,
        [courseId]: res.data.data.questions || [],
      }));
    } catch {}
  };

  const refreshCoupons = async (courseId) => {
    try {
      const res = await teacherApi.coupons.getByCourse(courseId);
      setCoupons((p) => ({ ...p, [courseId]: res.data.data.coupons || [] }));
    } catch {}
  };

  const handleToggleCourse = async (courseId, currentlyActive) => {
    try {
      await teacherApi.courses.updateCourse(courseId, {
        isActive: !currentlyActive,
      });
      setCourses((p) =>
        p.map((c) =>
          c._id === courseId ? { ...c, isActive: !currentlyActive } : c,
        ),
      );
      toast.success(
        currentlyActive ? "Course deactivated" : "Course activated",
      );
    } catch (err) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.code === "ACCESS_BLOCKED"
      ) {
        toast.error("Account blocked.");
      } else {
        toast.error("Failed to update");
      }
    }
  };

  const handleToggleCoupon = async (courseId, couponId, isActive) => {
    try {
      await teacherApi.coupons.toggleStatus(couponId, !isActive);
      setCoupons((p) => ({
        ...p,
        [courseId]: (p[courseId] || []).map((c) =>
          c._id === couponId ? { ...c, isActive: !isActive } : c,
        ),
      }));
    } catch {
      toast.error("Failed");
    }
  };

  const handleDeleteCoupon = async (courseId, couponId) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await teacherApi.coupons.delete(couponId);
      setCoupons((p) => ({
        ...p,
        [courseId]: (p[courseId] || []).filter((c) => c._id !== couponId),
      }));
      toast.success("Coupon deleted");
    } catch {
      toast.error("Failed");
    }
  };

  const questionsByDifficulty = (courseId) => {
    const qs = questions[courseId] || [];
    return qs.reduce((acc, q) => {
      const d = q.difficulty || "Unknown";
      if (!acc[d]) acc[d] = [];
      acc[d].push(q);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 200,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: "3px solid #bfdbfe",
            borderTopColor: "#2563eb",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            My Courses
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "9px 18px",
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            boxShadow: "0 3px 12px rgba(37,99,235,0.25)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "#fff",
            borderRadius: 16,
            border: "1.5px dashed #e2e8f0",
          }}
        >
          <p style={{ fontSize: 32, marginBottom: 12 }}>📚</p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            No courses yet
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
            Create your first course and start teaching
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "10px 22px",
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create First Course
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courses.map((course) => {
            const isExpanded = expandedId === course._id;
            const courseQs = questions[course._id];
            const courseQsByDiff = questionsByDifficulty(course._id);
            const courseCoupons = coupons[course._id] || [];
            const createdByAdmin = !course.teacher;
            const currencySymbol =
              course.geoRestriction === "nepal" ? "रू" : "₹";

            return (
              <div
                key={course._id}
                style={{
                  background: "#fff",
                  border: "1px solid #f1f5f9",
                  borderRadius: 14,
                  overflow: "hidden",
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(0,0,0,0.06)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                {/* course header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "16px 18px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleExpand(course._id)}
                >
                  {/* image */}
                  {course.image?.url ? (
                    <img
                      src={course.image.url}
                      alt={course.name}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        objectFit: "cover",
                        border: "1px solid #f1f5f9",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        background: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        flexShrink: 0,
                      }}
                    >
                      📖
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {course.name}
                      </h3>
                      {/* active/inactive badge */}
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: course.isActive ? "#f0fdf4" : "#f9fafb",
                          color: course.isActive ? "#16a34a" : "#6b7280",
                          border: `1px solid ${course.isActive ? "#bbf7d0" : "#e5e7eb"}`,
                        }}
                      >
                        {course.isActive ? "Active" : "Inactive"}
                      </span>
                      {/* paid/free */}
                      <span
                        style={{
                          padding: "1px 8px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: course.isPaid ? "#fffbeb" : "#f0fdf4",
                          color: course.isPaid ? "#92400e" : "#166534",
                          border: `1px solid ${course.isPaid ? "#fde68a" : "#bbf7d0"}`,
                        }}
                      >
                        {course.isPaid
                          ? `${currencySymbol}${course.price}`
                          : "Free"}
                      </span>
                      {/* created by admin badge */}
                      {createdByAdmin && (
                        <span
                          style={{
                            padding: "1px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#f3f4f6",
                            color: "#6b7280",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          by Admin
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>
                      {course.totalQuestions || 0} questions ·{" "}
                      {course.difficulties?.length || 0} difficulties
                    </p>
                  </div>

                  {/* actions */}
                  <div
                    style={{ display: "flex", gap: 6, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        handleToggleCourse(course._id, course.isActive)
                      }
                      style={{
                        padding: "5px 10px",
                        borderRadius: 7,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: course.isActive ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {course.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>

                  {/* expand arrow */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    style={{
                      flexShrink: 0,
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                {/* expanded: questions + coupons */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        overflow: "hidden",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <div style={{ padding: "16px 18px" }}>
                        {/* questions section */}
                        <div style={{ marginBottom: 20 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#374151",
                              marginBottom: 12,
                            }}
                          >
                            Questions by Difficulty
                          </p>

                          {questionsLoading[course._id] ? (
                            <div style={{ textAlign: "center", padding: 20 }}>
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  border: "2px solid #bfdbfe",
                                  borderTopColor: "#2563eb",
                                  borderRadius: "50%",
                                  animation: "spin 0.7s linear infinite",
                                  margin: "0 auto",
                                }}
                              />
                            </div>
                          ) : courseQs ? (
                            course.difficulties?.map((diff) => {
                              const diffQs = courseQsByDiff[diff.name] || [];
                              const key = `${course._id}-${diff.name}`;
                              const expanded = expandedDiff[key];

                              return (
                                <div
                                  key={diff.name}
                                  style={{
                                    marginBottom: 10,
                                    border: "1px solid #f1f5f9",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                  }}
                                >
                                  {/* diff header */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "10px 12px",
                                      background: "#f8fafc",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      setExpandedDiff((p) => ({
                                        ...p,
                                        [key]: !p[key],
                                      }))
                                    }
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                      }}
                                    >
                                      <span
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: 20,
                                          fontSize: 11,
                                          fontWeight: 700,
                                          background:
                                            diff.name === "Easy"
                                              ? "#f0fdf4"
                                              : diff.name === "Medium"
                                                ? "#fffbeb"
                                                : "#fef2f2",
                                          color:
                                            diff.name === "Easy"
                                              ? "#16a34a"
                                              : diff.name === "Medium"
                                                ? "#d97706"
                                                : "#dc2626",
                                        }}
                                      >
                                        {diff.name}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 12,
                                          color: "#64748b",
                                        }}
                                      >
                                        {diffQs.length} questions ·{" "}
                                        {diff.marksPerQuestion} marks each
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAddingQuestion({
                                          courseId: course._id,
                                          difficulty: diff.name,
                                          marksPerQuestion:
                                            diff.marksPerQuestion,
                                        });
                                      }}
                                      style={{
                                        padding: "4px 10px",
                                        borderRadius: 7,
                                        border: "1px solid #bfdbfe",
                                        background: "#eff6ff",
                                        color: "#2563eb",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                    >
                                      + Add
                                    </button>
                                  </div>

                                  {/* questions list */}
                                  {expanded && (
                                    <div style={{ padding: "8px 10px" }}>
                                      {diffQs.length === 0 ? (
                                        <p
                                          style={{
                                            fontSize: 12,
                                            color: "#94a3b8",
                                            textAlign: "center",
                                            padding: "10px 0",
                                          }}
                                        >
                                          No questions yet. Click + Add above.
                                        </p>
                                      ) : (
                                        diffQs.map((q, i) => (
                                          <div
                                            key={q._id || i}
                                            style={{
                                              display: "flex",
                                              alignItems: "flex-start",
                                              gap: 8,
                                              padding: "8px 10px",
                                              background: "#f8fafc",
                                              borderRadius: 8,
                                              marginBottom: 6,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: "#94a3b8",
                                                flexShrink: 0,
                                                marginTop: 2,
                                              }}
                                            >
                                              Q{i + 1}
                                            </span>
                                            <div
                                              style={{ flex: 1, minWidth: 0 }}
                                            >
                                              <p
                                                style={{
                                                  fontSize: 12,
                                                  color: "#374151",
                                                  lineHeight: 1.5,
                                                  marginBottom: 4,
                                                }}
                                                className="line-clamp-2"
                                              >
                                                {q.question}
                                              </p>
                                              <QTypeBadge
                                                type={q.questionType}
                                              />
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : null}
                        </div>

                        {/* coupons section (only for paid courses) */}
                        {course.isPaid && (
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 10,
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#374151",
                                }}
                              >
                                Coupons
                              </p>
                              {teacher?.couponAccess ? (
                                <button
                                  onClick={() => setAddingCoupon(course._id)}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: 7,
                                    border: "1px solid #bfdbfe",
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  + Add Coupon
                                </button>
                              ) : (
                                <span
                                  style={{ fontSize: 11, color: "#94a3b8" }}
                                >
                                  Contact admin for coupon access
                                </span>
                              )}
                            </div>

                            {addingCoupon === course._id && (
                              <div style={{ marginBottom: 10 }}>
                                <AddCouponForm
                                  courseId={course._id}
                                  onCreated={() => {
                                    setAddingCoupon(null);
                                    refreshCoupons(course._id);
                                  }}
                                  onCancel={() => setAddingCoupon(null)}
                                />
                              </div>
                            )}

                            {courseCoupons.length > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {courseCoupons.map((c) => (
                                  <CouponRow
                                    key={c._id}
                                    coupon={c}
                                    onToggle={(id, isActive) =>
                                      handleToggleCoupon(
                                        course._id,
                                        id,
                                        isActive,
                                      )
                                    }
                                    onDelete={(id) =>
                                      handleDeleteCoupon(course._id, id)
                                    }
                                  />
                                ))}
                              </div>
                            ) : (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#94a3b8",
                                  textAlign: "center",
                                  padding: "12px 0",
                                }}
                              >
                                {teacher?.couponAccess
                                  ? "No coupons yet."
                                  : "No coupons."}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateCourseModal
            key="create"
            teacher={teacher}
            onClose={() => setShowCreateModal(false)}
            onCreated={(course) => setCourses((p) => [course, ...p])}
          />
        )}
        {addingQuestion && (
          <AddQuestionModal
            key="addq"
            courseId={addingQuestion.courseId}
            difficulty={addingQuestion.difficulty}
            marksPerQuestion={addingQuestion.marksPerQuestion}
            onClose={() => setAddingQuestion(null)}
            onAdded={() => refreshQuestions(addingQuestion.courseId)}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`}</style>
    </div>
  );
};

export default CoursesTab;
