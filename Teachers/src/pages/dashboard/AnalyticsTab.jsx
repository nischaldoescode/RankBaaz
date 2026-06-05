/**
 * renders the teacher dashboard analytics tab with data loading, actions, forms, and mobile states
 *
 * @file teachers/src/pages/dashboard/analyticstab.jsx
 * @module teachers/src/pages/dashboard/analyticstab
 * @exports route component rendered by the client router
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { teacherApi } from "../../services/api.js";

const StatCard = ({ label, value, sub, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    style={{
      background: "#fff",
      border: "1px solid #f1f5f9",
      borderRadius: 14,
      padding: "20px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      transition: "box-shadow 0.15s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.06)")}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
  >
    <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
    <p style={{ fontSize: 28, fontWeight: 800, color: color || "#0f172a", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: 12, color: "#64748b" }}>{sub}</p>}
  </motion.div>
);

const AnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherApi.profile
      .getAnalytics()
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ width: 28, height: 28, border: "3px solid #bfdbfe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>Overview</h2>

      {/* stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Students" value={data.totalStudents} color="#2563eb" />
        <StatCard label="Tests Taken" value={data.totalTests} color="#7c3aed" />
        <StatCard label="Avg Score" value={`${data.averageScore}%`} color="#059669" />
        <StatCard label="Total Earnings" value={`₹${data.walletSummary.totalEarnings}`} color="#d97706" />
        <StatCard label="Pending Payout" value={`₹${data.walletSummary.pendingPayout}`} sub="will be processed by admin" />
      </div>

      {/* top students */}
      {data.topStudents.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Top Students</h3>
          <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 14, overflow: "hidden" }}>
            {data.topStudents.slice(0, 10).map((s, i) => (
              <div
                key={s.username}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 16px",
                  borderBottom: i < data.topStudents.length - 1 ? "1px solid #f8fafc" : "none",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: i === 0 ? "#fef9c3" : i === 1 ? "#f1f5f9" : "#fff7ed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: i === 0 ? "#ca8a04" : i === 1 ? "#475569" : "#d97706",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>@{s.username}</p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>{s.testCount} test{s.testCount !== 1 ? "s" : ""}</p>
                </div>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: s.averageScore >= 80 ? "#f0fdf4" : s.averageScore >= 60 ? "#fffbeb" : "#fef2f2",
                    color: s.averageScore >= 80 ? "#16a34a" : s.averageScore >= 60 ? "#d97706" : "#dc2626",
                  }}
                >
                  {s.averageScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* course performance */}
      {data.courseStats.length > 0 && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Course Performance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.courseStats.map((cs) => (
              <div
                key={cs.courseId}
                style={{
                  background: "#fff",
                  border: "1px solid #f1f5f9",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{cs.name}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>{cs.students} students · {cs.tests} tests</p>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>{cs.averageScore}%</p>
                    <p style={{ fontSize: 10, color: "#94a3b8" }}>avg score</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>{cs.students}</p>
                    <p style={{ fontSize: 10, color: "#94a3b8" }}>students</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.totalStudents === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "#fff",
            borderRadius: 14,
            border: "1.5px dashed #e2e8f0",
          }}
        >
          <p style={{ fontSize: 14, color: "#94a3b8" }}>
            No student data yet. Create and publish courses to start seeing analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTab;
