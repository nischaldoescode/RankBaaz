import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTeacher } from "../context/TeacherContext.jsx";
import { teacherApi } from "../services/api.js";
import toast from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useTeacher();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);

  const inputStyle = {
    width: "100%",
    height: 46,
    padding: "0 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 14,
    color: "#0f172a",
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotRegistered(false);
    setLoading(true);
    try {
      await login(form);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "";

      // 401 with specific "not found" message = not registered
      if (
        status === 401 &&
        (msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("invalid credentials"))
      ) {
        // check if email exists at all — we can do this by looking at the error
        // since the backend returns "Invalid credentials" for both wrong password
        // and non-existent email (security best practice), we show a helpful message
        // only if the email field looks valid but login fails
        const emailExists = await teacherApi.auth
          .checkEmailExists(form.email)
          .then((r) => r.data.exists)
          .catch(() => null);

        if (emailExists === false) {
          setNotRegistered(true);
        } else {
          toast.error("Invalid email or password");
        }
      } else if (status === 429) {
        toast.error("Too many login attempts. Wait 15 minutes.");
      } else {
        toast.error(msg || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f0f9ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter Variable', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 420 }}
      >
        {/* brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L1 9l11 6 11-6-11-6zM1 9v6m22-6v6M5.33 11.5L1 15l11 6 11-6-5.33-3.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Teacher Portal
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Sign in to your dashboard
          </p>
        </div>

        {/* not-registered notice */}
        {notRegistered && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "14px 16px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#92400e",
                marginBottom: 4,
              }}
            >
              Email not registered as a teacher
            </p>
            <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.6 }}>
              This email doesn't have a teacher account yet.{" "}
              <a
                href={`${import.meta.env.VITE_FRONTEND_URL || "https://vidhgrow.online"}/teacher`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#d97706",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Apply to become a teacher
              </a>{" "}
              on Vidhgrow first.
            </p>
          </motion.div>
        )}

        {/* card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
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
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }));
                  setNotRegistered(false);
                }}
                required
                placeholder="you@example.com"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

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
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  required
                  placeholder="Your password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* forgot password */}
            <div style={{ textAlign: "right", marginTop: -12 }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 13,
                  color: "#2563eb",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                width: "100%",
                height: 46,
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,0.3)",
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#94a3b8",
            marginTop: 20,
          }}
        >
          Not a teacher yet?{" "}
          <a
            href={`${import.meta.env.VITE_FRONTEND_URL || "https://vidhgrow.online"}/teacher`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#2563eb", fontWeight: 600 }}
          >
            Apply here
          </a>
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </div>
  );
};

export default Login;
