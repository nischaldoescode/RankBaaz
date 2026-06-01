import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { teacherApi } from "../../services/api.js";
import { useTeacher } from "../../context/TeacherContext.jsx";
import toast from "react-hot-toast";

// ── constants ──

const DICEBEAR = (seed) =>
  `https://api.dicebear.com/9.x/croodles-neutral/svg?seed=${encodeURIComponent(seed)}`;

const DIFF_COLORS = {
  Easy: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  Medium: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  Hard: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

// ── style helpers ──

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

const textareaS = {
  ...inputS,
  height: "auto",
  padding: "10px 12px",
  resize: "vertical",
  lineHeight: 1.5,
};

const focus = (e) => (e.target.style.borderColor = "#2563eb");
const blur = (e) => (e.target.style.borderColor = "#e2e8f0");

const FieldLabel = ({ children, required }) => (
  <label
    style={{
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "#374151",
      marginBottom: 6,
    }}
  >
    {children}
    {required && <span style={{ color: "#ef4444" }}> *</span>}
  </label>
);

const Modal = ({ onClose, children, maxWidth = 560 }) => (
  <div
    className="teacher-modal-overlay"
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      zIndex: 100,
      padding: "20px 16px",
      overflowY: "auto",
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <motion.div
      className="teacher-modal-panel"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "24px 22px",
        width: "100%",
        maxWidth,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        marginBottom: 20,
      }}
    >
      {children}
    </motion.div>
  </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 20,
    }}
  >
    <div>
      <h2
        style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
          {subtitle}
        </p>
      )}
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
        flexShrink: 0,
      }}
    >
      ×
    </button>
  </div>
);

const PrimaryBtn = ({ children, onClick, loading, disabled, style = {} }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    style={{
      padding: "10px 20px",
      border: "none",
      borderRadius: 9,
      background:
        loading || disabled
          ? "#93c5fd"
          : "linear-gradient(135deg,#2563eb,#1d4ed8)",
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      cursor: loading || disabled ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      gap: 8,
      boxShadow:
        loading || disabled ? "none" : "0 3px 10px rgba(37,99,235,0.2)",
      ...style,
    }}
  >
    {loading ? (
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
        {typeof loading === "string" ? loading : "Loading..."}
      </>
    ) : (
      children
    )}
  </button>
);

// ── add/edit question modal ──

const QuestionModal = ({
  courseId,
  difficulty,
  marksPerQuestion,
  question,
  onClose,
  onSaved,
}) => {
  const isEdit = !!question;
  const [form, setForm] = useState({
    question: question?.question || "",
    questionType: question?.questionType || "multiple",
    options: question?.options || ["", "", "", ""],
    correctAnswerIndex:
      typeof question?.correctAnswer === "number" ? question.correctAnswer : 0,
    singleAnswer:
      typeof question?.correctAnswer === "string" ? question.correctAnswer : "",
    truefalseAnswer:
      question?.questionType === "truefalse"
        ? question.correctAnswer === 0
          ? 0
          : 1
        : 0,
    explanation: question?.explanation || "",
    difficulty: question?.difficulty || difficulty,
  });
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (form.question.trim().length < 10) {
      toast.error("Question min 10 chars");
      return false;
    }
    if (form.explanation.trim().length < 10) {
      toast.error("Explanation min 10 chars");
      return false;
    }
    if (
      form.questionType === "multiple" &&
      form.options.some((o) => !o.trim())
    ) {
      toast.error("Fill all options");
      return false;
    }
    if (form.questionType === "single" && !form.singleAnswer.trim()) {
      toast.error("Answer required");
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const base = {
      question: form.question.trim(),
      explanation: form.explanation.trim(),
      questionType: form.questionType,
      difficulty: form.difficulty,
    };
    if (form.questionType === "multiple") {
      base.options = form.options;
      base.correctAnswerIndex = form.correctAnswerIndex;
    } else if (form.questionType === "single") {
      base.correctAnswer = form.singleAnswer.trim();
    } else {
      base.options = ["True", "False"];
      base.correctAnswerIndex = form.truefalseAnswer;
    }
    return base;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await teacherApi.courses.updateQuestion(
          courseId,
          question._id,
          buildPayload(),
        );
        toast.success("Question updated");
      } else {
        await teacherApi.courses.addQuestion(courseId, buildPayload());
        toast.success("Question added");
      }
      onSaved();
      onClose();
    } catch (err) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.code === "ACCESS_BLOCKED"
      ) {
        toast.error("Account blocked. Upload documents first.");
      } else {
        toast.error(err.response?.data?.message || "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={580}>
      <ModalHeader
        title={isEdit ? "Edit Question" : "Add Question"}
        subtitle={`${form.difficulty} · ${marksPerQuestion || 1} marks`}
        onClose={onClose}
      />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* type */}
        <div>
          <FieldLabel>Question Type</FieldLabel>
          <div
            className="teacher-question-type-grid"
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
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    questionType: t,
                    options:
                      t === "truefalse"
                        ? ["True", "False"]
                        : p.options.length < 2
                          ? ["", "", "", ""]
                          : p.options,
                  }))
                }
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

        {/* question text */}
        <div>
          <FieldLabel required>Question</FieldLabel>
          <textarea
            style={textareaS}
            rows={3}
            value={form.question}
            onChange={(e) =>
              setForm((p) => ({ ...p, question: e.target.value }))
            }
            placeholder="Question text (min 10 chars)..."
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

        {/* answers */}
        {form.questionType === "multiple" && (
          <div>
            <FieldLabel required>
              Options (click radio to mark correct)
            </FieldLabel>
            {(form.options.length < 4
              ? [...form.options, ...Array(4 - form.options.length).fill("")]
              : form.options
            ).map((opt, i) => (
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
                  style={{ flexShrink: 0, accentColor: "#2563eb" }}
                />
                <input
                  style={{ ...inputS, height: 36, flex: 1 }}
                  value={opt}
                  onChange={(e) => {
                    const o = [
                      ...(form.options.length < 4
                        ? [
                            ...form.options,
                            ...Array(4 - form.options.length).fill(""),
                          ]
                        : form.options),
                    ];
                    o[i] = e.target.value;
                    setForm((p) => ({ ...p, options: o }));
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  onFocus={focus}
                  onBlur={blur}
                />
                <span
                  style={{
                    fontSize: 11,
                    color:
                      form.correctAnswerIndex === i ? "#16a34a" : "#94a3b8",
                    fontWeight: 600,
                    width: 44,
                    flexShrink: 0,
                  }}
                >
                  {form.correctAnswerIndex === i ? "✓ Correct" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {form.questionType === "single" && (
          <div>
            <FieldLabel required>Correct Answer</FieldLabel>
            <input
              style={inputS}
              value={form.singleAnswer}
              onChange={(e) =>
                setForm((p) => ({ ...p, singleAnswer: e.target.value }))
              }
              placeholder="The correct answer..."
              onFocus={focus}
              onBlur={blur}
            />
          </div>
        )}

        {form.questionType === "truefalse" && (
          <div>
            <FieldLabel>Correct Answer</FieldLabel>
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
                  onClick={() => setForm((p) => ({ ...p, truefalseAnswer: i }))}
                  style={{
                    padding: "12px",
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
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* explanation */}
        <div>
          <FieldLabel required>Explanation</FieldLabel>
          <textarea
            style={textareaS}
            rows={2}
            value={form.explanation}
            onChange={(e) =>
              setForm((p) => ({ ...p, explanation: e.target.value }))
            }
            placeholder="Why is this the correct answer? (min 10 chars)"
            onFocus={focus}
            onBlur={blur}
          />
        </div>

        <div className="teacher-form-actions" style={{ display: "flex", gap: 10 }}>
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
          <PrimaryBtn
            style={{ flex: 2 }}
            loading={loading ? (isEdit ? "Updating..." : "Adding...") : false}
          >
            {isEdit ? "Update Question" : "Add Question"}
          </PrimaryBtn>
        </div>
      </form>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Modal>
  );
};

// ── coupon form ──

const CouponForm = ({ courseId, onCreated, onCancel }) => {
  const [form, setForm] = useState({
    code: "",
    discount: "10",
    maxUsage: "",
    validUntil: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = form.code
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4) {
      toast.error("Code must be 4+ chars");
      return;
    }
    setLoading(true);
    try {
      await teacherApi.coupons.create({
        courseId,
        code: clean,
        discount: parseInt(form.discount),
        maxUsage: form.maxUsage ? parseInt(form.maxUsage) : null,
        validUntil: form.validUntil || null,
      });
      toast.success("Coupon created");
      onCreated();
    } catch (err) {
      if (err.response?.data?.code === "COUPON_ACCESS_DENIED") {
        toast.error("Admin hasn't granted coupon access yet.");
      } else {
        toast.error(err.response?.data?.message || "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 14,
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <FieldLabel>Code *</FieldLabel>
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
          <FieldLabel>Discount *</FieldLabel>
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
          <FieldLabel>Max Uses</FieldLabel>
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
          <FieldLabel>Expires</FieldLabel>
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
      <div className="teacher-form-actions" style={{ display: "flex", gap: 8 }}>
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
        <PrimaryBtn
          style={{ flex: 2 }}
          loading={loading ? "Creating..." : false}
        >
          Create Coupon
        </PrimaryBtn>
      </div>
    </form>
  );
};

// ── video links manager ──

const VideoLinksManager = ({ course, onSaved }) => {
  const [videoType, setVideoType] = useState(
    course?.videoContent?.type || "none",
  );
  const [courseLinks, setCourseLinks] = useState(
    course?.videoContent?.courseVideo?.links || [{ url: "", title: "" }],
  );
  const [diffLinks, setDiffLinks] = useState(() => {
    const existing = course?.videoContent?.difficultyVideos || [];
    const map = {};
    existing.forEach((dv) => {
      map[dv.difficulty] = dv.links;
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const detectPlatform = (url) => {
    if (!url) return null;
    try {
      const h = new URL(url).hostname.replace("www.", "");
      if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
      if (h.includes("vimeo")) return "Vimeo";
      if (h.includes("dailymotion")) return "Dailymotion";
      return "Other";
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { videoType };
      if (videoType === "course") {
        const valid = courseLinks.filter((l) => l.url?.trim());
        if (valid.length === 0) {
          toast.error("Add at least one video URL");
          setSaving(false);
          return;
        }
        payload.courseVideoLinks = JSON.stringify(valid);
      } else if (videoType === "difficulty") {
        const data = {};
        course.difficulties?.forEach((d) => {
          const links = (diffLinks[d.name] || []).filter((l) => l.url?.trim());
          if (links.length > 0) data[d.name] = { links };
        });
        if (Object.keys(data).length === 0) {
          toast.error("Add at least one video link");
          setSaving(false);
          return;
        }
        payload.difficultyVideosData = JSON.stringify(data);
      } else {
        payload.videoType = "remove";
      }
      await teacherApi.courses.updateCourse(course._id, payload);
      toast.success("Videos saved");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const LinkRow = ({ link, index, links, setLinks }) => (
    <div style={{ marginBottom: 10 }}>
      <div className="teacher-link-row" style={{ display: "flex", gap: 8 }}>
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
        >
          <input
            style={{ ...inputS, height: 38 }}
            value={link.url}
            onChange={(e) => {
              const n = [...links];
              n[index] = { ...n[index], url: e.target.value };
              setLinks(n);
            }}
            placeholder="https://youtube.com/watch?v=..."
            onFocus={focus}
            onBlur={blur}
          />
          <input
            style={{ ...inputS, height: 34, fontSize: 12 }}
            value={link.title || ""}
            onChange={(e) => {
              const n = [...links];
              n[index] = { ...n[index], title: e.target.value };
              setLinks(n);
            }}
            placeholder="Video title (optional)"
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        {links.length > 1 && (
          <button
            type="button"
            onClick={() => setLinks(links.filter((_, i) => i !== index))}
            style={{
              padding: "0 10px",
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fff5f5",
              color: "#dc2626",
              cursor: "pointer",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
      {link.url && detectPlatform(link.url) && (
        <span
          style={{
            display: "inline-block",
            marginTop: 4,
            padding: "1px 8px",
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 600,
            background: "#f0fdf4",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
          }}
        >
          ✓ {detectPlatform(link.url)}
        </span>
      )}
    </div>
  );

  return (
    <div>
      <FieldLabel>Video Type</FieldLabel>
      <select
        style={{ ...inputS, marginBottom: 16 }}
        value={videoType}
        onChange={(e) => setVideoType(e.target.value)}
        onFocus={focus}
        onBlur={blur}
      >
        <option value="none">No Videos</option>
        <option value="course">Same for All Difficulties</option>
        <option value="difficulty">Per Difficulty</option>
      </select>

      {videoType === "course" && (
        <div
          style={{
            padding: 14,
            background: "#f0f9ff",
            borderRadius: 12,
            border: "1px solid #bae6fd",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#0369a1",
              marginBottom: 10,
            }}
          >
            Course Video Links
          </p>
          {courseLinks.map((link, i) => (
            <LinkRow
              key={i}
              link={link}
              index={i}
              links={courseLinks}
              setLinks={setCourseLinks}
            />
          ))}
          {courseLinks.length < 2 && (
            <button
              type="button"
              onClick={() =>
                setCourseLinks([...courseLinks, { url: "", title: "" }])
              }
              style={{
                width: "100%",
                padding: "8px",
                border: "2px dashed #bae6fd",
                borderRadius: 8,
                background: "transparent",
                color: "#0369a1",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add Link ({courseLinks.length}/2)
            </button>
          )}
        </div>
      )}

      {videoType === "difficulty" &&
        course?.difficulties?.map((d) => {
          const links = diffLinks[d.name] || [{ url: "", title: "" }];
          const dc = DIFF_COLORS[d.name] || DIFF_COLORS.Medium;
          const setLinks = (newLinks) =>
            setDiffLinks((p) => ({ ...p, [d.name]: newLinks }));
          return (
            <div
              key={d.name}
              style={{
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${dc.border}`,
                background: dc.bg,
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: dc.color,
                  marginBottom: 10,
                }}
              >
                {d.name} Difficulty
              </p>
              {links.map((link, i) => (
                <LinkRow
                  key={i}
                  link={link}
                  index={i}
                  links={links}
                  setLinks={setLinks}
                />
              ))}
              {links.length < 2 && (
                <button
                  type="button"
                  onClick={() => setLinks([...links, { url: "", title: "" }])}
                  style={{
                    width: "100%",
                    padding: "7px",
                    border: `2px dashed ${dc.border}`,
                    borderRadius: 8,
                    background: "transparent",
                    color: dc.color,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Link ({links.length}/2)
                </button>
              )}
            </div>
          );
        })}

      <PrimaryBtn
        onClick={handleSave}
        loading={saving ? "Saving..." : false}
        style={{ width: "100%", justifyContent: "center" }}
      >
        Save Video Links
      </PrimaryBtn>
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
    hasPdfExport: false,
  });
  const [difficulties, setDifficulties] = useState([
    {
      name: "Easy",
      enabled: true,
      marksPerQuestion: 5,
      maxQuestions: 10,
      minTime: 30,
      maxTime: 60,
    },
    {
      name: "Medium",
      enabled: true,
      marksPerQuestion: 7,
      maxQuestions: 7,
      minTime: 45,
      maxTime: 90,
    },
    {
      name: "Hard",
      enabled: true,
      marksPerQuestion: 10,
      maxQuestions: 5,
      minTime: 60,
      maxTime: 120,
    },
  ]);
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

  const updateDifficulty = (name, patch) => {
    setDifficulties((prev) =>
      prev.map((diff) => (diff.name === name ? { ...diff, ...patch } : diff)),
    );
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

    const activeDifficulties = difficulties.filter((diff) => diff.enabled);
    if (activeDifficulties.length === 0) {
      toast.error("Select at least one difficulty level");
      return;
    }

    const invalidDifficulty = activeDifficulties.find((diff) => {
      const marks = Number(diff.marksPerQuestion);
      const questions = Number(diff.maxQuestions);
      const minTime = Number(diff.minTime);
      const maxTime = Number(diff.maxTime);
      return (
        !Number.isFinite(marks) ||
        !Number.isFinite(questions) ||
        !Number.isFinite(minTime) ||
        !Number.isFinite(maxTime) ||
        marks < 1 ||
        questions < 1 ||
        minTime < 1 ||
        maxTime < minTime
      );
    });

    if (invalidDifficulty) {
      toast.error(`Check ${invalidDifficulty.name} difficulty settings`);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("isPaid", form.isPaid);
      fd.append("hasPdfExport", form.hasPdfExport ? "true" : "false");
      if (form.isPaid === "true") fd.append("price", form.price);
      if (image) fd.append("image", image);
      fd.append(
        "difficulties",
        JSON.stringify(
          activeDifficulties.map((diff) => ({
            name: diff.name,
            marksPerQuestion: Number(diff.marksPerQuestion),
            maxQuestions: Number(diff.maxQuestions),
            timerSettings: {
              minTime: Number(diff.minTime),
              maxTime: Number(diff.maxTime),
            },
          })),
        ),
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
        toast.error("Account blocked. Upload documents first.");
      } else {
        toast.error(err.response?.data?.message || "Failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={840}>
      <ModalHeader
        title="Create Course"
        subtitle="Set the structure students will use for practice tests"
        onClose={onClose}
      />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) minmax(220px,0.8fr)",
            gap: 16,
          }}
          className="teacher-course-create-grid"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <FieldLabel required>Course Name</FieldLabel>
              <input
                style={inputS}
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Introduction to Mathematics"
                required
                onFocus={focus}
                onBlur={blur}
              />
            </div>
            <div>
              <FieldLabel required>Description</FieldLabel>
              <textarea
                style={textareaS}
                rows={5}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What students will practice and what level this course is for."
                required
                onFocus={focus}
                onBlur={blur}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Course Image</FieldLabel>
            {imagePreview ? (
              <div style={{ position: "relative" }}>
                <img
                  src={imagePreview}
                  alt=""
                  style={{
                    width: "100%",
                    height: 178,
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
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <label
                style={{
                  height: 178,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px dashed #e2e8f0",
                  borderRadius: 10,
                  padding: "18px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#f8fafc",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "#2563eb")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#e2e8f0")
                }
              >
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Upload PNG or JPG, up to 5MB
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
        </div>

        <div>
          <FieldLabel>Pricing</FieldLabel>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              ["false", "Free"],
              ["true", "Paid"],
            ].map(([v, label]) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {form.isPaid === "true" && (
          <div>
            <FieldLabel required>
              Price ({teacher?.country === "nepal" ? "रू NPR" : "₹ INR"})
            </FieldLabel>
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
              <p style={{ fontSize: 11, color: "#7c3aed", marginTop: 4 }}>
                Nepal-only course with Khalti payment.
              </p>
            )}
          </div>
        )}

        <div>
          <FieldLabel required>Difficulty Setup</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {difficulties.map((diff) => {
              const active = diff.enabled;
              return (
                <div
                  key={diff.name}
                  style={{
                    border: `1.5px solid ${active ? DIFF_COLORS[diff.name].border : "#e5e7eb"}`,
                    background: active ? DIFF_COLORS[diff.name].bg : "#f9fafb",
                    borderRadius: 12,
                    padding: 12,
                    opacity: active ? 1 : 0.65,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: active ? 12 : 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateDifficulty(diff.name, { enabled: !active })
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        color: active ? DIFF_COLORS[diff.name].color : "#64748b",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      {diff.name}
                    </button>
                    <span
                      style={{
                        fontSize: 11,
                        color: active ? DIFF_COLORS[diff.name].color : "#94a3b8",
                        fontWeight: 700,
                      }}
                    >
                      {active ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  {active && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 8,
                      }}
                      className="teacher-difficulty-grid"
                    >
                      {[
                        ["marksPerQuestion", "Marks"],
                        ["maxQuestions", "Questions"],
                        ["minTime", "Min sec"],
                        ["maxTime", "Max sec"],
                      ].map(([key, label]) => (
                        <label key={key} style={{ minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 10,
                              color: "#64748b",
                              fontWeight: 600,
                              marginBottom: 4,
                            }}
                          >
                            {label}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={diff[key]}
                            onChange={(e) =>
                              updateDifficulty(diff.name, {
                                [key]: e.target.value,
                              })
                            }
                            style={{ ...inputS, height: 36 }}
                            onFocus={focus}
                            onBlur={blur}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Enable result PDF export
            </p>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Students can download their completed test report when enabled.
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.hasPdfExport}
            onChange={(e) =>
              setForm((p) => ({ ...p, hasPdfExport: e.target.checked }))
            }
            style={{ width: 18, height: 18 }}
          />
        </label>

        <div className="teacher-form-actions" style={{ display: "flex", gap: 10 }}>
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
          <PrimaryBtn
            style={{ flex: 2, justifyContent: "center" }}
            loading={loading ? "Creating..." : false}
          >
            Create Course
          </PrimaryBtn>
        </div>
      </form>
      <style>{`
        @media(max-width:720px){
          .teacher-course-create-grid{grid-template-columns:1fr!important;}
          .teacher-difficulty-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
        }
        @media(max-width:420px){
          .teacher-difficulty-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
    </Modal>
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
  const [showCreate, setShowCreate] = useState(false);
  const [questionModal, setQuestionModal] = useState(null); // { courseId, difficulty, marksPerQuestion, question? }
  const [addingCoupon, setAddingCoupon] = useState(null);
  const [expandedSection, setExpandedSection] = useState({}); // { courseId: "questions"|"coupons"|"videos" }
  const [expandedDiff, setExpandedDiff] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: "question", courseId, questionId }

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

  const loadQuestions = async (courseId) => {
    if (questions[courseId]) return;
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
  };

  const loadCoupons = async (courseId) => {
    if (coupons[courseId]) return;
    try {
      const res = await teacherApi.coupons.getByCourse(courseId);
      setCoupons((p) => ({ ...p, [courseId]: res.data.data.coupons || [] }));
    } catch {}
  };

  const handleExpand = async (courseId) => {
    if (expandedId === courseId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(courseId);
    await loadQuestions(courseId);
    await loadCoupons(courseId);
  };

  const refreshQuestions = async (courseId) => {
    setQuestionsLoading((p) => ({ ...p, [courseId]: true }));
    try {
      const res = await teacherApi.courses.getQuestions(courseId);
      setQuestions((p) => ({
        ...p,
        [courseId]: res.data.data.questions || [],
      }));
    } catch {
    } finally {
      setQuestionsLoading((p) => ({ ...p, [courseId]: false }));
    }
  };

  const refreshCoupons = async (courseId) => {
    try {
      const res = await teacherApi.coupons.getByCourse(courseId);
      setCoupons((p) => ({ ...p, [courseId]: res.data.data.coupons || [] }));
    } catch {}
  };

  const handleToggleCourse = async (courseId, currently) => {
    try {
      await teacherApi.courses.updateCourse(courseId, { isActive: !currently });
      setCourses((p) =>
        p.map((c) => (c._id === courseId ? { ...c, isActive: !currently } : c)),
      );
      toast.success(currently ? "Course deactivated" : "Course activated");
    } catch (err) {
      if (
        err.response?.status === 403 &&
        err.response?.data?.code === "ACCESS_BLOCKED"
      ) {
        toast.error("Account blocked.");
      } else {
        toast.error("Failed");
      }
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirm) return;
    try {
      await teacherApi.courses.deleteQuestion(
        deleteConfirm.courseId,
        deleteConfirm.questionId,
      );
      setQuestions((p) => ({
        ...p,
        [deleteConfirm.courseId]: (p[deleteConfirm.courseId] || []).filter(
          (q) => q._id !== deleteConfirm.questionId,
        ),
      }));
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const toggleSection = (courseId, section) => {
    setExpandedSection((p) => ({
      ...p,
      [courseId]: p[courseId] === section ? null : section,
    }));
  };

  const questionsByDiff = (courseId) => {
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

  const SectionBtn = ({ label, active, onClick, count }) => (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: `1.5px solid ${active ? "#2563eb" : "#e2e8f0"}`,
        background: active ? "#eff6ff" : "#fff",
        color: active ? "#2563eb" : "#475569",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        transition: "all 0.12s",
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            padding: "0 5px",
            borderRadius: 10,
            background: active ? "#2563eb" : "#e2e8f0",
            color: active ? "#fff" : "#64748b",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="teacher-courses-tab">
      {/* header */}
      <div
        className="teacher-tab-header"
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
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            My Courses
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
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
            width="15"
            height="15"
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
          <div
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 12px",
              borderRadius: 12,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
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
            onClick={() => setShowCreate(true)}
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
        <div className="teacher-course-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courses.map((course) => {
            const isExpanded = expandedId === course._id;
            const activeSection = expandedSection[course._id];
            const courseQsByDiff = questionsByDiff(course._id);
            const totalQs = (questions[course._id] || []).length;
            const courseCoupons = coupons[course._id] || [];
            const currencySymbol =
              course.geoRestriction === "nepal" ? "रू" : "₹";

            return (
              <div
                className="teacher-course-card"
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
                  className="teacher-course-card-header"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                  }}
                >
                  {course.image?.url ? (
                    <img
                      src={course.image.url}
                      alt={course.name}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        objectFit: "cover",
                        border: "1px solid #f1f5f9",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        background: "#eff6ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                      </svg>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 4,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#0f172a",
                          margin: 0,
                          wordBreak: "break-word",
                        }}
                      >
                        {course.name}
                      </h3>
                      <span
                        style={{
                          padding: "1px 7px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          background: course.isActive ? "#f0fdf4" : "#f9fafb",
                          color: course.isActive ? "#16a34a" : "#6b7280",
                          border: `1px solid ${course.isActive ? "#bbf7d0" : "#e5e7eb"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.isActive ? "Active" : "Inactive"}
                      </span>
                      <span
                        style={{
                          padding: "1px 7px",
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          background: course.isPaid ? "#fffbeb" : "#f0fdf4",
                          color: course.isPaid ? "#92400e" : "#166534",
                          border: `1px solid ${course.isPaid ? "#fde68a" : "#bbf7d0"}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.isPaid
                          ? `${currencySymbol}${course.price}`
                          : "Free"}
                      </span>
                    </div>
                    {course.description && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          margin: "0 0 6px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {course.description}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                      {totalQs} questions · {course.difficulties?.length || 0}{" "}
                      difficulties
                    </p>
                  </div>

                  <div
                    className="teacher-course-actions"
                    style={{
                      display: "flex",
                      gap: 6,
                      flexShrink: 0,
                      alignItems: "flex-start",
                    }}
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleExpand(course._id)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: isExpanded ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isExpanded ? "#2563eb" : "#94a3b8",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* expanded body */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        overflow: "hidden",
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      {/* section tabs */}
                      <div
                        className="teacher-section-tabs"
                        style={{
                          display: "flex",
                          gap: 8,
                          padding: "12px 16px 0",
                          flexWrap: "wrap",
                        }}
                      >
                        <SectionBtn
                          label="Questions"
                          active={activeSection === "questions"}
                          onClick={() => toggleSection(course._id, "questions")}
                          count={totalQs}
                        />
                        {course.isPaid && (
                          <>
                            <SectionBtn
                              label="Coupons"
                              active={activeSection === "coupons"}
                              onClick={() =>
                                toggleSection(course._id, "coupons")
                              }
                              count={courseCoupons.length}
                            />
                            <SectionBtn
                              label="Videos"
                              active={activeSection === "videos"}
                              onClick={() =>
                                toggleSection(course._id, "videos")
                              }
                            />
                          </>
                        )}
                      </div>

                      {/* questions section */}
                      <AnimatePresence>
                        {activeSection === "questions" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ padding: "12px 16px 16px" }}
                          >
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
                            ) : (
                              course.difficulties?.map((diff) => {
                                const diffQs = courseQsByDiff[diff.name] || [];
                                const dc =
                                  DIFF_COLORS[diff.name] || DIFF_COLORS.Medium;
                                const diffKey = `${course._id}-${diff.name}`;
                                const expanded = expandedDiff[diffKey];

                                return (
                                  <div
                                    className="teacher-diff-card"
                                    key={diff.name}
                                    style={{
                                      marginBottom: 8,
                                      border: `1px solid ${dc.border}`,
                                      borderRadius: 10,
                                      overflow: "hidden",
                                    }}
                                  >
                                    {/* diff header */}
                                    <div
                                      className="teacher-diff-header"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "9px 12px",
                                        background: dc.bg,
                                        cursor: "pointer",
                                      }}
                                      onClick={() =>
                                        setExpandedDiff((p) => ({
                                          ...p,
                                          [diffKey]: !p[diffKey],
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
                                            color: dc.color,
                                            background: "#fff",
                                            border: `1px solid ${dc.border}`,
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
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 6,
                                          alignItems: "center",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          onClick={() =>
                                            setQuestionModal({
                                              courseId: course._id,
                                              difficulty: diff.name,
                                              marksPerQuestion:
                                                diff.marksPerQuestion,
                                            })
                                          }
                                          style={{
                                            padding: "4px 10px",
                                            borderRadius: 7,
                                            border: `1px solid ${dc.border}`,
                                            background: "#fff",
                                            color: dc.color,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                          }}
                                        >
                                          + Add
                                        </button>
                                        <svg
                                          width="14"
                                          height="14"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#94a3b8"
                                          strokeWidth="2.5"
                                          style={{
                                            transform: expanded
                                              ? "rotate(180deg)"
                                              : "none",
                                            transition: "transform 0.2s",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <path d="M6 9l6 6 6-6" />
                                        </svg>
                                      </div>
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
                                            No questions. Click + Add above.
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
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  color: "#94a3b8",
                                                  flexShrink: 0,
                                                  marginTop: 3,
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
                                                    margin: "0 0 4px",
                                                    overflow: "hidden",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                  }}
                                                >
                                                  {q.question}
                                                </p>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    gap: 6,
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      padding: "1px 6px",
                                                      borderRadius: 10,
                                                      fontSize: 9,
                                                      fontWeight: 700,
                                                      background: "#eff6ff",
                                                      color: "#2563eb",
                                                    }}
                                                  >
                                                    {q.questionType ===
                                                    "multiple"
                                                      ? "MCQ"
                                                      : q.questionType ===
                                                          "single"
                                                        ? "Short"
                                                        : "T/F"}
                                                  </span>
                                                </div>
                                              </div>
                                              {/* edit + delete */}
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: 4,
                                                  flexShrink: 0,
                                                }}
                                              >
                                                <button
                                                  onClick={() =>
                                                    setQuestionModal({
                                                      courseId: course._id,
                                                      difficulty: diff.name,
                                                      marksPerQuestion:
                                                        diff.marksPerQuestion,
                                                      question: q,
                                                    })
                                                  }
                                                  style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 7,
                                                    border: "1px solid #e2e8f0",
                                                    background: "#fff",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#64748b",
                                                  }}
                                                  title="Edit"
                                                >
                                                  <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                  >
                                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setDeleteConfirm({
                                                      type: "question",
                                                      courseId: course._id,
                                                      questionId: q._id,
                                                    })
                                                  }
                                                  style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 7,
                                                    border: "1px solid #fecaca",
                                                    background: "#fff5f5",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "#dc2626",
                                                  }}
                                                  title="Delete"
                                                >
                                                  <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                  >
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                                    <path d="M10 11v6M14 11v6" />
                                                    <path d="M9 6V4h6v2" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* coupons section */}
                      <AnimatePresence>
                        {activeSection === "coupons" && course.isPaid && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ padding: "12px 16px 16px" }}
                          >
                            {teacher?.couponAccess ? (
                              <>
                                {addingCoupon === course._id && (
                                  <CouponForm
                                    courseId={course._id}
                                    onCreated={() => {
                                      setAddingCoupon(null);
                                      refreshCoupons(course._id);
                                    }}
                                    onCancel={() => setAddingCoupon(null)}
                                  />
                                )}
                                {addingCoupon !== course._id && (
                                  <button
                                    onClick={() => setAddingCoupon(course._id)}
                                    style={{
                                      marginBottom: 10,
                                      padding: "7px 14px",
                                      border: "1.5px dashed #bfdbfe",
                                      borderRadius: 8,
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    + New Coupon
                                  </button>
                                )}
                              </>
                            ) : (
                              <div
                                style={{
                                  padding: "10px 12px",
                                  background: "#fffbeb",
                                  borderRadius: 8,
                                  border: "1px solid #fde68a",
                                  marginBottom: 10,
                                  fontSize: 12,
                                  color: "#92400e",
                                }}
                              >
                                Contact admin to enable coupon creation for your
                                account.
                              </div>
                            )}
                            {courseCoupons.length === 0 ? (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#94a3b8",
                                  textAlign: "center",
                                  padding: "10px 0",
                                }}
                              >
                                No coupons yet.
                              </p>
                            ) : (
                              courseCoupons.map((c) => (
                                <div
                                  key={c._id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "9px 12px",
                                    background: "#f8fafc",
                                    borderRadius: 9,
                                    border: "1px solid #f1f5f9",
                                    marginBottom: 6,
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
                                    {c.code}
                                  </code>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: "#16a34a",
                                    }}
                                  >
                                    {c.discount}% OFF
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      padding: "1px 7px",
                                      borderRadius: 20,
                                      background: c.isActive
                                        ? "#f0fdf4"
                                        : "#f9fafb",
                                      color: c.isActive ? "#16a34a" : "#6b7280",
                                      border: `1px solid ${c.isActive ? "#bbf7d0" : "#e5e7eb"}`,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {c.isActive ? "Active" : "Inactive"}
                                  </span>
                                  <span
                                    style={{ fontSize: 11, color: "#94a3b8" }}
                                  >
                                    Used {c.usageCount}
                                    {c.maxUsage ? `/${c.maxUsage}` : ""}
                                  </span>
                                  <div
                                    style={{
                                      marginLeft: "auto",
                                      display: "flex",
                                      gap: 6,
                                    }}
                                  >
                                    <button
                                      onClick={async () => {
                                        await teacherApi.coupons.toggleStatus(
                                          c._id,
                                          !c.isActive,
                                        );
                                        refreshCoupons(course._id);
                                      }}
                                      style={{
                                        padding: "3px 9px",
                                        borderRadius: 7,
                                        border: "1px solid #e5e7eb",
                                        background: "#fff",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        color: "#374151",
                                      }}
                                    >
                                      {c.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm("Delete coupon?"))
                                          return;
                                        await teacherApi.coupons.delete(c._id);
                                        refreshCoupons(course._id);
                                        toast.success("Deleted");
                                      }}
                                      style={{
                                        padding: "3px 9px",
                                        borderRadius: 7,
                                        border: "1px solid #fecaca",
                                        background: "#fff5f5",
                                        fontSize: 10,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        color: "#dc2626",
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* videos section */}
                      <AnimatePresence>
                        {activeSection === "videos" && course.isPaid && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ padding: "12px 16px 16px" }}
                          >
                            <VideoLinksManager
                              course={course}
                              onSaved={() => {
                                loadCourses();
                                toggleSection(course._id, null);
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
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
        {showCreate && (
          <CreateCourseModal
            key="create"
            teacher={teacher}
            onClose={() => setShowCreate(false)}
            onCreated={(c) => setCourses((p) => [c, ...p])}
          />
        )}
        {questionModal && (
          <QuestionModal
            key="question"
            courseId={questionModal.courseId}
            difficulty={questionModal.difficulty}
            marksPerQuestion={questionModal.marksPerQuestion}
            question={questionModal.question}
            onClose={() => setQuestionModal(null)}
            onSaved={() => refreshQuestions(questionModal.courseId)}
          />
        )}
      </AnimatePresence>

      {/* delete confirm */}
      {deleteConfirm && (
        <div
          className="teacher-delete-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            padding: 16,
          }}
        >
          <div
            className="teacher-delete-panel"
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "24px 22px",
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 10,
              }}
            >
              Delete Question?
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              This cannot be undone.
            </p>
            <div className="teacher-form-actions" style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
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
                onClick={handleDeleteQuestion}
                style={{
                  flex: 1,
                  height: 40,
                  border: "none",
                  borderRadius: 9,
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default CoursesTab;
