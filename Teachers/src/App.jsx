/**
 * defines teacher portal routes, auth gates, onboarding pages, and dashboard entry points
 *
 * @file teachers/src/app.jsx
 * @module teachers/src/app
 * @exports root app component consumed by main.jsx
 */

import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { TeacherProvider, useTeacher } from "./context/TeacherContext.jsx";
import "@fontsource-variable/inter";
import "./index.css";

const Login = React.lazy(() => import("./pages/Login.jsx"));
const Signup = React.lazy(() => import("./pages/Signup.jsx"));
const InviteExpired = React.lazy(() => import("./pages/InviteExpired.jsx"));
const TeacherDashboard = React.lazy(
  () => import("./pages/dashboard/TeacherDashboard.jsx"),
);

const Spinner = () => (
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

const ProtectedRoute = ({ children }) => {
  const { teacher, initializing } = useTeacher();
  if (initializing) return <Spinner />;
  if (!teacher) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { teacher, initializing } = useTeacher();
  if (initializing) return <Spinner />;
  if (teacher) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route
      path="/login"
      element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      }
    />
    <Route path="/signup" element={<Signup />} />
    <Route path="/invite-expired" element={<InviteExpired />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <TeacherDashboard />
        </ProtectedRoute>
      }
    />
    {/* catch-all */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <TeacherProvider>
      <Suspense fallback={<Spinner />}>
        <AppRoutes />
      </Suspense>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "'Inter Variable', sans-serif",
            fontSize: "14px",
            borderRadius: "10px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          },
          success: { iconTheme: { primary: "#2563eb", secondary: "#fff" } },
        }}
      />
    </TeacherProvider>
  </BrowserRouter>
);

export default App;
