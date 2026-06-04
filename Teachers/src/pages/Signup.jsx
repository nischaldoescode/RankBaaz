/**
 * keeps the signup page focused and readable.
 */
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { teacherApi } from "../services/api.js";
import { teacherRequestSigner } from "../utils/requestSigning.js";
import toast from "react-hot-toast";
import { checkReservedUsername } from "../utils/reservedUsernames.js";

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
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const textareaStyle = {
  ...inputStyle,
  height: "auto",
  padding: "12px 14px",
  resize: "vertical",
  lineHeight: 1.5,
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

const FieldLabel = ({ children }) => (
  <label
    style={{
      display: "block",
      fontSize: 13,
      fontWeight: 600,
      color: "#374151",
      marginBottom: 8,
    }}
  >
    {children}
  </label>
);

const FieldWrap = ({ label, hint, children }) => (
  <div>
    {label && <FieldLabel>{label}</FieldLabel>}
    {children}
    {hint && (
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 5 }}>{hint}</p>
    )}
  </div>
);

const normalizeNameParts = (name = "") =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length >= 2);

const normalizeUsernameInput = (value, maxLength = 30) =>
  value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .slice(0, maxLength);

const usernameUsesName = (username, name) => {
  const parts = normalizeNameParts(name);
  if (parts.length === 0) return true;

  const compactUsername = username.replace(/_/g, "");
  const compactName = parts.join("");

  return (
    (compactName.length >= 3 && compactUsername.includes(compactName)) ||
    parts.some((part) => compactUsername.includes(part))
  );
};

const buildUsernameSuggestions = (name, maxLength = 30) => {
  const parts = normalizeNameParts(name);
  if (parts.length === 0) return [];

  const [first, second] = parts;
  const compact = parts.join("");
  const underscored = [first, second].filter(Boolean).join("_");
  const initial = second ? `${first}_${second[0]}` : "";

  return Array.from(new Set([compact, underscored, initial]))
    .map((item) => normalizeUsernameInput(item, maxLength))
    .filter((item) => item.length >= 3 && item.length <= maxLength);
};

const Signup = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);

  const [step, setStep] = useState(1); // 1=credentials, 2=otp, 3=profile
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    bio: "",
    qualification: "",
  });
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contentSettings, setContentSettings] = useState(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const siteName = contentSettings?.siteName || "Vidhgrow";
  const logoUrl = contentSettings?.logo?.url;

  const usernameSuggestions = useMemo(
    () => buildUsernameSuggestions(inviteData?.name || ""),
    [inviteData?.name],
  );

  useEffect(() => {
    teacherApi.content
      .settings()
      .then((res) => setContentSettings(res.data.data.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  // verify invite token
  useEffect(() => {
    if (!token) {
      navigate("/invite-expired");
      return;
    }
    teacherApi.auth
      .verifyInvite(token)
      .then((r) => {
        // check if already registered
        if (r.data.data?.alreadyRegistered) {
          navigate("/invite-expired?reason=already_registered", {
            replace: true,
          });
          return;
        }
        setInviteData(r.data.data);
      })
      .catch((err) => {
        const code = err.response?.data?.code;
        const status = err.response?.status;

        if (code === "LINK_EXPIRED" || status === 410) {
          navigate("/invite-expired?reason=expired", { replace: true });
        } else if (code === "ALREADY_REGISTERED") {
          navigate("/invite-expired?reason=already_registered", {
            replace: true,
          });
        } else if (status === 400 || status === 401) {
          navigate("/invite-expired?reason=invalid", { replace: true });
        } else {
          navigate("/invite-expired?reason=expired", { replace: true });
        }
      })

      .finally(() => setVerifying(false));
  }, [token, navigate]);

  useEffect(() => {
    if (!form.username && usernameSuggestions.length > 0) {
      setForm((p) => ({ ...p, username: usernameSuggestions[0] }));
    }
  }, [form.username, usernameSuggestions]);

  // otp countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      await teacherApi.auth.sendOtp({ email: inviteData.email, token });
      setOtpSent(true);
      setOtpTimer(15); // 2 min cooldown
      toast.success(`OTP sent to ${inviteData.email}`);
    } catch (err) {
      if (
        err.response?.data?.code === "LINK_EXPIRED" ||
        err.response?.status === 410
      ) {
        navigate("/invite-expired");
      } else if (err.response?.status === 429) {
        toast.error("Too many OTP requests. Wait a few minutes.");
      } else {
        toast.error(err.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await teacherApi.auth.verifyOtp({
        email: inviteData.email,
        otp: otp.trim(),
      });
      toast.success("Email verified");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = () => {
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (
      form.password.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)
    ) {
      toast.error("Password: 8+ chars, upper, lower, number");
      return;
    }
    const normalizedUsername = normalizeUsernameInput(form.username);
    if (normalizedUsername !== form.username) {
      setForm((p) => ({ ...p, username: normalizedUsername }));
    }

    const reservedCheck = checkReservedUsername(normalizedUsername);
    if (reservedCheck.reserved) {
      toast.error(reservedCheck.reason || "This username is not available");
      return;
    }

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30 ||
      !/^[a-z0-9_]+$/.test(normalizedUsername)
    ) {
      toast.error("Username: 3-30 chars, lowercase, numbers, underscores");
      return;
    }
    if (!usernameUsesName(normalizedUsername, inviteData?.name || "")) {
      toast.error("Use your invited name in the username");
      return;
    }
    const ageNum = parseInt(form.age);
    if (isNaN(ageNum) || ageNum < 19 || ageNum > 100) {
      toast.error("Age must be between 19 and 100");
      return;
    }
    if (!form.gender) {
      toast.error("Please select your gender");
      return;
    }
    setStep(2);
    // auto-send otp when entering step 2
    if (!otpSent) {
      setTimeout(handleSendOtp, 300);
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await teacherApi.auth.signup({
        token,
        password: form.password,
        username: normalizeUsernameInput(form.username),
        age: parseInt(form.age),
        gender: form.gender,
        bio: form.bio,
        qualification: form.qualification,
      });
      const { teacher, signingSecret, signingSecretExpiresIn } = res.data.data;
      localStorage.setItem("teacher", JSON.stringify(teacher));
      if (signingSecret) {
        teacherRequestSigner.setSigningSecret(
          signingSecret,
          signingSecretExpiresIn,
        );
      }
      toast.success("Account created. Welcome!");
      navigate("/dashboard");
    } catch (err) {
      if (
        err.response?.data?.code === "LINK_EXPIRED" ||
        err.response?.status === 410
      ) {
        navigate("/invite-expired");
      } else {
        toast.error(err.response?.data?.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
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

  const stepLabels = ["Account", "Verify Email", "Profile"];
  const totalSteps = 3;

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
        style={{ width: "100%", maxWidth: 480 }}
      >
        {/* header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              minHeight: 58,
              maxWidth: 220,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {logoUrl && !logoBroken ? (
              <img
                src={logoUrl}
                alt={siteName}
                onError={() => setLogoBroken(true)}
                style={{
                  maxWidth: "100%",
                  maxHeight: 58,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  borderRadius: 8,
                  background: "rgba(37,99,235,0.09)",
                  color: "#2563eb",
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
              >
                {siteName}
              </div>
            )}
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Complete Registration
          </h1>
          {inviteData && (
            <p style={{ fontSize: 14, color: "#64748b" }}>
              Welcome,{" "}
              <strong style={{ color: "#0f172a" }}>{inviteData.name}</strong>
            </p>
          )}
        </div>

        {/* step progress */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 4,
                  background: i < step ? "#2563eb" : "#e2e8f0",
                  transition: "background 0.4s",
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
            Step {step} of {totalSteps}: {stepLabels[step - 1]}
          </p>
        </div>

        {/* card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "32px 28px",
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06)",
            border: "1px solid rgba(226,232,240,0.8)",
          }}
        >
          {/* invite info */}
          {inviteData && (
            <div
              style={{
                padding: "10px 14px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                marginBottom: 22,
                fontSize: 13,
                color: "#0369a1",
              }}
            >
              <strong>Email:</strong> {inviteData.email} &nbsp;·&nbsp;{" "}
              <strong>Country:</strong>{" "}
              {inviteData.country === "india" ? "India" : "Nepal"}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* credentials and basic details */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <FieldWrap
                  label="Username"
                  hint={`Use your name, 3-30 chars · lowercase, numbers, underscores`}
                >
                  <input
                    style={inputStyle}
                    value={form.username}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        username: normalizeUsernameInput(e.target.value),
                      }))
                    }
                    placeholder={usernameSuggestions[0] || "your_username"}
                    required
                    minLength={3}
                    maxLength={30}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </FieldWrap>
                {usernameSuggestions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: -8,
                    }}
                  >
                    {usernameSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, username: suggestion }))
                        }
                        style={{
                          border: "1px solid #bfdbfe",
                          background:
                            form.username === suggestion ? "#dbeafe" : "#eff6ff",
                          color: "#1d4ed8",
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        @{suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <FieldWrap label="Age" hint="Must be 19+">
                    <input
                      type="number"
                      style={inputStyle}
                      value={form.age}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, age: e.target.value }))
                      }
                      placeholder="25"
                      min={19}
                      max={100}
                      required
                      onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </FieldWrap>

                  <FieldWrap label="Gender">
                    <select
                      style={selectStyle}
                      value={form.gender}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, gender: e.target.value }))
                      }
                      required
                      onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </FieldWrap>
                </div>

                <FieldWrap
                  label="Password"
                  hint="8+ chars with upper, lower & number"
                >
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      style={{ ...inputStyle, paddingRight: 44 }}
                      value={form.password}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="Min 8 characters"
                      required
                      onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
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
                        {showPass ? (
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
                </FieldWrap>

                <FieldWrap label="Confirm Password">
                  <input
                    type="password"
                    style={inputStyle}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Repeat password"
                    required
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </FieldWrap>

                <motion.button
                  type="button"
                  onClick={handleStep1}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%",
                    height: 46,
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                    marginTop: 4,
                  }}
                >
                  Continue →
                </motion.button>
              </motion.div>
            )}

            {/* email verification */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <div style={{ textAlign: "center", marginBottom: 4 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: "#eff6ff",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 14px",
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
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <p
                    style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}
                  >
                    We sent a 6-digit OTP to{" "}
                    <strong style={{ color: "#2563eb" }}>
                      {inviteData?.email}
                    </strong>
                  </p>
                </div>

                <FieldWrap label="Enter OTP">
                  <input
                    style={{
                      ...inputStyle,
                      textAlign: "center",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "0.3em",
                    }}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="● ● ● ● ● ●"
                    maxLength={6}
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </FieldWrap>

                <motion.button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6 || loading}
                  whileHover={{
                    scale: otp.length === 6 && !loading ? 1.01 : 1,
                  }}
                  whileTap={{ scale: otp.length === 6 && !loading ? 0.98 : 1 }}
                  style={{
                    width: "100%",
                    height: 46,
                    background:
                      otp.length !== 6 || loading
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: otp.length !== 6 || loading ? "#94a3b8" : "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor:
                      otp.length !== 6 || loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow:
                      otp.length === 6 && !loading
                        ? "0 4px 14px rgba(37,99,235,0.3)"
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
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </motion.button>

                <div
                  style={{
                    textAlign: "center",
                    display: "flex",
                    gap: 12,
                    justifyContent: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 13,
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpTimer > 0}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 13,
                      color: otpTimer > 0 ? "#94a3b8" : "#2563eb",
                      cursor:
                        otpTimer > 0 || sendingOtp ? "not-allowed" : "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {sendingOtp
                      ? "Sending..."
                      : otpTimer > 0
                        ? `Resend in ${otpTimer}s`
                        : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* profile details */}
            {step === 3 && (
              <motion.form
                key="s3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                onSubmit={handleFinalSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 18 }}
              >
                <FieldWrap label="Bio" hint={`${form.bio.length}/500`}>
                  <textarea
                    style={textareaStyle}
                    rows={3}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, bio: e.target.value }))
                    }
                    placeholder="Tell students about yourself..."
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </FieldWrap>

                <FieldWrap label="Qualification">
                  <textarea
                    style={textareaStyle}
                    rows={3}
                    maxLength={300}
                    value={form.qualification}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, qualification: e.target.value }))
                    }
                    placeholder="Degrees, certifications, experience..."
                    onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </FieldWrap>

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1,
                      height: 46,
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Back
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    style={{
                      flex: 2,
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
                      boxShadow: loading
                        ? "none"
                        : "0 4px 14px rgba(37,99,235,0.3)",
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
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </div>
  );
};

export default Signup;
