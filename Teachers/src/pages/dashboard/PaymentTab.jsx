/**
 * keeps the payment tab page focused and readable.
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
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

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const PaymentTab = () => {
  const { teacher, updateTeacher } = useTeacher();
  const isIndia = teacher?.country === "india";
  const isNepal = teacher?.country === "nepal";
  const verified = teacher?.paymentDetails?.verified;

  const [form, setForm] = useState({
    accountNumber: "",
    ifsc: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
    esewaId: "",
    khaltiId: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = isIndia
        ? {
            india: {
              accountNumber: form.accountNumber,
              ifsc: form.ifsc,
              accountHolderName: form.accountHolderName,
              bankName: form.bankName,
              upiId: form.upiId || undefined,
            },
          }
        : {
            nepal: {
              esewaId: form.esewaId || undefined,
              khaltiId: form.khaltiId || undefined,
            },
          };

      await teacherApi.profile.updatePayment(payload);
      toast.success("Payment details saved. Admin will verify shortly.");
    } catch {
      toast.error("Failed to save payment details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teacher-narrow-tab teacher-payment-tab" style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
        Payout Details
      </h2>
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28 }}>
        Add your payment details to receive earnings from course sales.
      </p>

      {/* revenue card */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af, #1d4ed8)",
          borderRadius: 16,
          padding: "24px",
          marginBottom: 20,
          color: "#fff",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Your revenue share
        </p>
        <p style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
          {teacher?.revenueSharePercent || 80}%
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
          of every course sale goes directly to you
        </p>
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 10,
            fontSize: 12,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
          }}
        >
          Platform keeps 20% for infrastructure, support, and payment processing.
          Payouts are processed after admin verification of your payment details.
        </div>
      </div>

      {/* verification status */}
      <div
        style={{
          padding: "14px 16px",
          background: verified ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${verified ? "#bbf7d0" : "#fde68a"}`,
          borderRadius: 12,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: verified ? "#dcfce7" : "#fef9c3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {verified ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: verified ? "#166534" : "#92400e" }}>
            {verified ? "Payment details verified" : "Verification pending"}
          </p>
          <p style={{ fontSize: 12, color: verified ? "#4ade80" : "#d97706", marginTop: 2 }}>
            {verified
              ? "You will receive payouts after each transaction is processed."
              : "Add your payment details below. An admin will verify them within 24–48 hours."}
          </p>
        </div>
      </div>

      {/* form */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #f1f5f9",
          borderRadius: 16,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {isIndia ? "India Bank Details" : "Nepal Payment Details"}
        </p>

        {isIndia && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Account Number</label>
              <input
                style={inputStyle}
                value={form.accountNumber}
                onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                placeholder="Bank account number"
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div className="teacher-payment-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>IFSC Code</label>
                <input
                  style={inputStyle}
                  value={form.ifsc}
                  onChange={(e) => setForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                  placeholder="SBIN0001234"
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Bank Name</label>
                <input
                  style={inputStyle}
                  value={form.bankName}
                  onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="State Bank of India"
                  onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Account Holder Name</label>
              <input
                style={inputStyle}
                value={form.accountHolderName}
                onChange={(e) => setForm((p) => ({ ...p, accountHolderName: e.target.value }))}
                placeholder="Full name as on bank account"
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>UPI ID (optional)</label>
              <input
                style={inputStyle}
                value={form.upiId}
                onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
                placeholder="name@upi"
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>
          </>
        )}

        {isNepal && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>eSewa ID</label>
              <input
                style={inputStyle}
                value={form.esewaId}
                onChange={(e) => setForm((p) => ({ ...p, esewaId: e.target.value }))}
                placeholder="Registered phone number"
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Your eSewa registered phone number (98XXXXXXXX)
              </p>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Khalti ID (optional)</label>
              <input
                style={inputStyle}
                value={form.khaltiId}
                onChange={(e) => setForm((p) => ({ ...p, khaltiId: e.target.value }))}
                placeholder="Registered phone number"
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <p style={{ fontSize: 12, color: "#94a3b8" }}>
                Your Khalti registered phone number (98XXXXXXXX)
              </p>
            </div>
          </>
        )}

        <motion.button
          onClick={handleSave}
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.01 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          style={{
            height: 44,
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
            boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,0.25)",
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
            "Save Payment Details"
          )}
        </motion.button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PaymentTab;
