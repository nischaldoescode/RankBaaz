import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminProvider } from "./contexts/AdminContext";
import { ContentProvider } from "./contexts/ContentContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import Courses from "./pages/Courses";
import CreateCourse from "./pages/CreateCourse";
import Setting from "./components/Setting.jsx";
import UserStats from "./pages/UserStats";
import "./App.css";
import AdminRegister from "./pages/AdminRegister.jsx";
import UserManagement from "./pages/UserManageMent.jsx";
import ContentManagement from "./pages/ContentManagement.jsx";
import CouponManagement from "./pages/UniversalCoupons.jsx";
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen w-full bg-gray-50">
          <ToastContainer
            position="bottom-center"
            autoClose={5000}
            hideProgressBar={true}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            closeButton
            toastStyle={{
              background: "#363636",
              color: "#fff",
              borderRadius: "8px",
              padding: "16px",
            }}
          />

          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AdminProvider>
                    <ContentProvider>
                      <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
                        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
                        <div className="flex-1 flex flex-col min-w-0 w-full">
                          <Navbar
                            onToggleSidebar={toggleSidebar}
                            sidebarOpen={sidebarOpen}
                          />
                          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 w-full">
                            <div className="w-full max-w-none">
                              <Routes>
                                <Route
                                  path="/"
                                  element={<Navigate to="/dashboard" replace />}
                                />
                                <Route
                                  path="/dashboard"
                                  element={<Dashboard />}
                                />
                                <Route
                                  path="/categories"
                                  element={<Categories />}
                                />
                                <Route path="/courses" element={<Courses />} />
                                <Route
                                  path="/courses/create"
                                  element={<CreateCourse />}
                                />
                                <Route
                                  path="/courses/edit/:id"
                                  element={<CreateCourse />}
                                />
                                <Route path="/setting" element={<Setting />} />
                                <Route
                                  path="/user-stats"
                                  element={<UserStats />}
                                />
                                <Route
                                  path="/users"
                                  element={<UserManagement />}
                                />
                                <Route
                                  path="/content"
                                  element={<ContentManagement />}
                                />
                                <Route
                                  path="/coupons"
                                  element={<CouponManagement />}
                                />
                              </Routes>
                            </div>
                          </main>
                        </div>
                      </div>
                    </ContentProvider>
                  </AdminProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
