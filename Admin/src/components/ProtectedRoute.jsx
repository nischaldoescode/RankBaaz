import React from "react";
import { useAuth } from "../contexts/AuthContext"; // Add this import

const ProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-red-800">Access Denied</h2>
            <p className="text-red-600 mt-2">
              You don't have admin privileges to access this panel.
            </p>
            <button
              onClick={() => (window.location.href = "/login")}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 mt-4"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content if authenticated and is admin
  return children;
};

export default ProtectedRoute;
