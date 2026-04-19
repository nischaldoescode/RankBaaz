import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeacher } from "../../context/TeacherContext.jsx";
import CoursesTab from "./CoursesTab.jsx";
import ProfileTab from "./ProfileTab.jsx";
import PaymentTab from "./PaymentTab.jsx";
import DocumentsTab from "./DocumentsTab.jsx";
import toast from "react-hot-toast";

const NAV_ITEMS = [
  {
    id: "courses",
    label: "Courses",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "payment",
    label: "Payouts",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: "documents",
    label: "Documents",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
];

const Avatar = ({ teacher, size = 40 }) => {
  const initial = teacher?.name?.charAt(0)?.toUpperCase() || "T";
  const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626"];
  const color = colors[initial.charCodeAt(0) % colors.length];

  if (teacher?.profileImage?.url) {
    return (
      <img
        src={teacher.profileImage.url}
        alt={teacher.name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #e2e8f0",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.2)",
      }}
    >
      {initial}
    </div>
  );
};

const StatusPill = ({ verified }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: verified ? "#dcfce7" : "#fef9c3",
      color: verified ? "#166534" : "#854d0e",
      border: `1px solid ${verified ? "#bbf7d0" : "#fde68a"}`,
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: verified ? "#16a34a" : "#ca8a04",
      }}
    />
    {verified ? "Payment verified" : "Payment pending"}
  </span>
);

const TeacherDashboard = () => {
  const { teacher, courses, loading, logout } = useTeacher();
  const [tab, setTab] = useState("courses");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    toast.success("Signed out");
  };

  if (loading) {
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const SIDEBAR_W = 260;

  const SidebarContent = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "0 0 24px",
      }}
    >
      {/* brand */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L1 9l11 6 11-6-11-6zM1 9v6m22-6v6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1,
              }}
            >
              Vidhgrow
            </p>
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              Teacher Portal
            </p>
          </div>
        </div>

        {/* teacher info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #f1f5f9",
          }}
        >
          <Avatar teacher={teacher} size={40} />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0f172a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {teacher?.name}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              @{teacher?.username}
            </p>
          </div>
        </div>

        <div
          style={{ marginTop: 10, display: "flex", justifyContent: "center" }}
        >
          <StatusPill verified={teacher?.paymentDetails?.verified} />
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0 8px",
            marginBottom: 8,
          }}
        >
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: active ? "#eff6ff" : "transparent",
                color: active ? "#2563eb" : "#475569",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                marginBottom: 2,
                transition: "all 0.15s",
                position: "relative",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              {active && (
                <motion.div
                  layoutId="sidebarActive"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#eff6ff",
                    borderRadius: 10,
                    zIndex: 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                style={{ position: "relative", zIndex: 1, display: "flex" }}
              >
                {item.icon}
              </span>
              <span style={{ position: "relative", zIndex: 1 }}>
                {item.label}
              </span>
              {active && (
                <motion.div
                  layoutId="sidebarDot"
                  style={{
                    position: "absolute",
                    right: 12,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#2563eb",
                    zIndex: 1,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* bottom */}
      <div style={{ padding: "0 12px" }}>
        <div
          style={{
            padding: "12px 14px",
            background: "#f0f9ff",
            borderRadius: 12,
            border: "1px solid #bae6fd",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0369a1",
              marginBottom: 3,
            }}
          >
            Revenue Share
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#0284c7" }}>
            {teacher?.revenueSharePercent || 80}%
          </p>
          <p style={{ fontSize: 11, color: "#7dd3fc" }}>
            of every sale goes to you
          </p>
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #fee2e2",
            background: "#fff5f5",
            color: "#ef4444",
            fontSize: 13,
            fontWeight: 600,
            cursor: loggingOut ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff5f5")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter Variable', sans-serif",
      }}
    >
      {/* desktop sidebar */}
      <aside
        style={{
          width: SIDEBAR_W,
          background: "#fff",
          borderRight: "1px solid #f1f5f9",
          flexShrink: 0,
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: "auto",
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
        }}
        className="hidden-mobile"
      >
        <SidebarContent />
      </aside>

      {/* mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 40,
              }}
            />
            <motion.aside
              initial={{ x: -SIDEBAR_W }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_W }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                width: SIDEBAR_W,
                background: "#fff",
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 50,
                overflowY: "auto",
                boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* main content */}
      <main
        style={{
          flex: 1,
          marginLeft: 0,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* topbar */}
        <header
          style={{
            height: 60,
            background: "#fff",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            position: "sticky",
            top: 0,
            zIndex: 20,
            gap: 16,
          }}
        >
          {/* hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="show-mobile"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#475569",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {NAV_ITEMS.find((n) => n.id === tab)?.label}
            </h1>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>
              {tab === "courses" && `${courses.length} total`}
              {tab === "profile" && `@${teacher?.username}`}
              {tab === "payment" &&
                (teacher?.paymentDetails?.verified
                  ? "Verified"
                  : "Verification pending")}
            </p>
          </div>

          <Avatar teacher={teacher} size={34} />
        </header>

        {/* tab content */}
        <div
          style={{
            flex: 1,
            padding: "24px 20px",
            maxWidth: 900,
            width: "100%",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
            >
              {/* show blocked overlay for all tabs except documents */}
              {teacher?.accessBlocked && tab !== "documents" ? (
                <div
                  style={{
                    padding: "40px 24px",
                    textAlign: "center",
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #fecaca",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      background: "#fef2f2",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 20px",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </div>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#991b1b",
                      marginBottom: 10,
                    }}
                  >
                    Account Access Restricted
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      lineHeight: 1.7,
                      maxWidth: 400,
                      margin: "0 auto 20px",
                    }}
                  >
                    {teacher.accessBlockReason ||
                      "Admin has requested verification documents. Please upload them to restore access."}
                  </p>
                  <button
                    onClick={() => setTab("documents")}
                    style={{
                      padding: "10px 24px",
                      background: "linear-gradient(135deg,#dc2626,#b91c1c)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 9,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 3px 10px rgba(220,38,38,0.25)",
                    }}
                  >
                    Upload Documents →
                  </button>
                </div>
              ) : (
                <>
                  {tab === "courses" && <CoursesTab />}
                  {tab === "profile" && <ProfileTab />}
                  {tab === "analytics" && <AnalyticsTab />}
                  {tab === "payment" && <PaymentTab />}
                  {tab === "documents" && <DocumentsTab />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          main { margin-left: ${SIDEBAR_W}px !important; }
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
