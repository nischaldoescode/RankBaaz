import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { TeacherProvider, useTeacher } from "./context/TeacherContext.jsx";
import "@fontsource-variable/inter";

const Login = React.lazy(() => import("./pages/Login.jsx"));
const Signup = React.lazy(() => import("./pages/Signup.jsx"));
const InviteExpired = React.lazy(() => import("./pages/InviteExpired.jsx"));
const TeacherDashboard = React.lazy(() => import("./pages/dashboard/TeacherDashboard.jsx"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { teacher, initializing } = useTeacher();
  if (initializing) return <PageLoader />;
  if (!teacher) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { teacher, initializing } = useTeacher();
  if (initializing) return <PageLoader />;
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
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <TeacherProvider>
      <Suspense fallback={<PageLoader />}>
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