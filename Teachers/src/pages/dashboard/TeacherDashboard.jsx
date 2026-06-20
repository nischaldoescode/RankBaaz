/**
 * renders the teacher dashboard teacher dashboard tab with data loading, actions, forms, and mobile states
 *
 * @file teachers/src/pages/dashboard/teacherdashboard.jsx
 * @module teachers/src/pages/dashboard/teacherdashboard
 * @exports route component rendered by the client router
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeacher } from "../../context/TeacherContext.jsx";
import CoursesTab from "./CoursesTab.jsx";
import ProfileTab from "./ProfileTab.jsx";
import PaymentTab from "./PaymentTab.jsx";
import DocumentsTab from "./DocumentTab.jsx";
import AnalyticsTab from "./AnalyticsTab.jsx";
import { teacherApi } from "../../services/api.js";
import toast from "react-hot-toast";

/**
 * builds dicebear avatar urls with the croodles-neutral style
 */
const dicebearUrl = (seed) =>
  `https://api.dicebear.com/9.x/croodles-neutral/svg?seed=${encodeURIComponent(seed)}`;

const NAV_ITEMS = [
  {
    id: "analytics",
    label: "Overview",
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
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
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

const RESTRICTED_ALLOWED_TABS = new Set(["profile", "documents"]);

const Avatar = ({ teacher, size = 40 }) => {
  const seed = teacher?.username || teacher?.name || "teacher";
  const avatarUrl = dicebearUrl(seed);

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
          flexShrink: 0,
        }}
      />
    );
  }

  // use dicebear as fallback
  return (
    <img
      src={avatarUrl}
      alt={teacher?.name || "Teacher"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid #e2e8f0",
        background: "#f1f5f9",
        flexShrink: 0,
      }}
    />
  );
};

const BlockedOverlay = ({ teacher, onGoToDocuments }) => (
  <div
    style={{
      padding: "48px 24px",
      textAlign: "center",
      background: "#fff",
      borderRadius: 16,
      border: "1.5px solid #fecaca",
    }}
  >
    <div
      style={{
        width: 72,
        height: 72,
        background: "#fef2f2",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
      }}
    >
      <svg
        width="32"
        height="32"
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
        fontSize: 18,
        fontWeight: 700,
        color: "#991b1b",
        marginBottom: 12,
      }}
    >
      Account Access Restricted
    </h3>
    <p
      style={{
        fontSize: 14,
        color: "#6b7280",
        lineHeight: 1.8,
        maxWidth: 440,
        margin: "0 auto 24px",
      }}
    >
      {teacher?.accessBlockReason ||
        "An admin has restricted your account access. Please upload the required verification documents to restore full access."}
    </p>
    {teacher?.documentRequestNote && (
      <div
        style={{
          padding: "12px 16px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 10,
          marginBottom: 20,
          fontSize: 13,
          color: "#92400e",
          maxWidth: 440,
          margin: "0 auto 20px",
          textAlign: "left",
        }}
      >
        <strong>Admin note:</strong> {teacher.documentRequestNote}
      </div>
    )}
    <button
      onClick={onGoToDocuments}
      style={{
        padding: "11px 28px",
        background: "linear-gradient(135deg,#dc2626,#b91c1c)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(220,38,38,0.25)",
      }}
    >
      Upload Documents
    </button>
  </div>
);

const NotificationBell = ({
  notifications,
  unreadCount,
  open,
  onToggle,
  onOpenTab,
  onMarkRead,
  onMarkAllRead,
}) => {
  const recent = Array.isArray(notifications) ? notifications.slice(0, 6) : [];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Open notifications"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "#fff",
          color: "#334155",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "absolute",
              top: 46,
              right: 0,
              width: "min(360px, calc(100vw - 28px))",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              boxShadow: "0 20px 55px rgba(15,23,42,0.18)",
              overflow: "hidden",
              zIndex: 60,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  Notifications
                </p>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  Review updates from Vidhgrow
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  style={{
                    border: "none",
                    background: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: 999,
                    padding: "6px 9px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Mark read
                </button>
              )}
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: 18, color: "#64748b", fontSize: 13 }}>
                No notifications yet.
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {recent.map((item) => (
                  <button
                    type="button"
                    key={item._id}
                    onClick={() => {
                      if (!item.readAt) onMarkRead(item._id);
                      if (item.link) onOpenTab(item.link);
                    }}
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      background: item.readAt ? "#fff" : "#f8fbff",
                      padding: "13px 16px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                        {item.title}
                      </p>
                      {!item.readAt && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#2563eb",
                            marginTop: 5,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.55 }}>
                      {item.message}
                    </p>
                    <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TeacherDashboard = () => {
  const {
    teacher,
    courses,
    loading,
    logout,
    notifications,
    unreadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useTeacher();
  const [tab, setTab] = useState("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [contentSettings, setContentSettings] = useState(null);
  const [logoBroken, setLogoBroken] = useState(false);
  const SIDEBAR_W = 260;
  const siteName = contentSettings?.siteName || "Vidhgrow";
  const logoUrl = contentSettings?.logo?.url;
  const isRestricted =
    !!teacher &&
    (teacher.accessBlocked || teacher.documentStatus !== "verified");

  useEffect(() => {
    teacherApi.content
      .settings()
      .then((res) => setContentSettings(res.data.data.settings))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  useEffect(() => {
    if (isRestricted && !RESTRICTED_ALLOWED_TABS.has(tab)) {
      setTab("documents");
    }
  }, [isRestricted, tab]);

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
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const docBadge =
    teacher?.documentStatus === "pending"
      ? "Review"
      : isRestricted
        ? "Needed"
        : null;

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
        style={{ padding: "22px 20px 18px", borderBottom: "1px solid #f1f5f9" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.16)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {logoUrl && !logoBroken ? (
              <img
                src={logoUrl}
                alt={siteName}
                onError={() => setLogoBroken(true)}
                style={{
                  maxWidth: 36,
                  maxHeight: 36,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <span style={{ color: "#2563eb", fontSize: 14, fontWeight: 800 }}>
                {siteName.charAt(0).toUpperCase()}
              </span>
            )}
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
              {siteName}
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
            gap: 10,
            padding: "10px 12px",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #f1f5f9",
          }}
        >
          <Avatar teacher={teacher} size={38} />
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
                fontSize: 11,
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

        {/* blocked/pending warning */}
        {isRestricted && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              background:
                teacher?.documentStatus === "pending" ? "#fffbeb" : "#fef2f2",
              border: `1px solid ${
                teacher?.documentStatus === "pending" ? "#fde68a" : "#fecaca"
              }`,
              borderRadius: 8,
              fontSize: 11,
              color:
                teacher?.documentStatus === "pending" ? "#d97706" : "#dc2626",
              fontWeight: 500,
            }}
          >
            {teacher?.documentStatus === "pending"
              ? "Documents under review"
              : teacher?.accessBlocked
              ? "Account restricted. Upload documents."
              : "Verification documents required"}
          </div>
        )}
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "14px 12px" }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          const isDocuments = item.id === "documents";
          const disabled = isRestricted && !RESTRICTED_ALLOWED_TABS.has(item.id);
          return (
            <button
              key={item.id}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                setTab(item.id);
                setSidebarOpen(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background: active ? "#eff6ff" : "transparent",
                color: disabled ? "#cbd5e1" : active ? "#2563eb" : "#475569",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                marginBottom: 2,
                transition: "all 0.12s",
                textAlign: "left",
                position: "relative",
                opacity: disabled ? 0.55 : 1,
              }}
              onMouseEnter={(e) => {
                if (!active && !disabled)
                  e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (!active && !disabled)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {item.icon}
              {item.label}
              {isDocuments && docBadge && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      teacher?.documentStatus === "pending"
                        ? "#d97706"
                        : "#dc2626",
                  }}
                >
                  {docBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* revenue pill */}
      <div style={{ padding: "0 12px" }}>
        <div
          style={{
            padding: "12px 14px",
            background: "#f0f9ff",
            borderRadius: 12,
            border: "1px solid #bae6fd",
            marginBottom: 10,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0369a1",
              marginBottom: 2,
            }}
          >
            Revenue Share
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#0284c7" }}>
            {teacher?.revenueSharePercent || 80}%
          </p>
          <p style={{ fontSize: 10, color: "#7dd3fc" }}>
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
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid #fee2e2",
            background: "#fff5f5",
            color: "#ef4444",
            fontSize: 13,
            fontWeight: 600,
            cursor: loggingOut ? "not-allowed" : "pointer",
            transition: "all 0.12s",
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
      className="teacher-dashboard-shell"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Inter Variable', sans-serif",
        overflowX: "hidden",
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
        className="teacher-sidebar-desktop"
      >
        <SidebarContent />
      </aside>

      {/* mobile overlay */}
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
              className="teacher-sidebar-mobile"
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

      {/* main */}
      <main
        style={{
          flex: 1,
          marginLeft: 0,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
        className="teacher-main"
      >
        {/* topbar */}
        <header
          className="teacher-topbar"
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
            gap: 14,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="teacher-hamburger"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#475569",
              padding: 4,
              display: "flex",
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
              {NAV_ITEMS.find((n) => n.id === tab)?.label || "Dashboard"}
            </h1>
          </div>

          <NotificationBell
            notifications={notifications}
            unreadCount={unreadNotifications}
            open={notificationsOpen}
            onToggle={() => setNotificationsOpen((open) => !open)}
            onOpenTab={(nextTab) => {
              if (RESTRICTED_ALLOWED_TABS.has(nextTab) || !isRestricted) {
                setTab(nextTab);
              }
              setNotificationsOpen(false);
            }}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
          <Avatar teacher={teacher} size={34} />
        </header>

        {/* content */}
        <div
          className="teacher-content"
          style={{
            flex: 1,
            padding: "28px",
            maxWidth: 1180,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {/* server-backed restriction guard for disabled sections */}
              {isRestricted && !RESTRICTED_ALLOWED_TABS.has(tab) ? (
                <BlockedOverlay
                  teacher={teacher}
                  onGoToDocuments={() => setTab("documents")}
                />
              ) : (
                <>
                  {tab === "analytics" && <AnalyticsTab />}
                  {tab === "courses" && <CoursesTab />}
                  {tab === "profile" && <ProfileTab />}
                  {tab === "payment" && <PaymentTab />}
                  {tab === "documents" && <DocumentsTab />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(min-width:768px){
          .teacher-main{margin-left:${SIDEBAR_W}px!important;}
          .teacher-sidebar-desktop{display:flex!important;}
          .teacher-hamburger{display:none!important;}
        }
        @media(max-width:767px){
          .teacher-sidebar-desktop{display:none!important;}
          .teacher-hamburger{display:flex!important;}
        }
      `}</style>
    </div>
  );
};

export default TeacherDashboard;
