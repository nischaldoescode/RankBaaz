/**
 * boots the public vidhgrow app, providers, router, theme state, and global styles
 *
 * @file frontend/src/main.jsx
 * @module frontend/src/main
 * @exports vite entry module for browser startup
 */

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CourseProvider } from "./context/CourseContext.jsx";
import { TestProvider } from "./context/TestContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles/globals.css";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// register service worker for image caching
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // console.log('service worker registered:', registration.scope);
      })
      .catch((error) => {
        // console.error('service worker registration failed:', error);
      });
  });
}

// initialize cache cleanup on app start
import { cacheManager } from "./utils/cacheManager";

// // clear expired cache entries on startup
// cachemanager.clearexpired().then((cleared) => {
// if (cleared > 0) {
// console.log(`[cache] cleaned up ${cleared} expired entries on startu`);
// }
// });

// // optional: log cache stats
// cachemanager.getstats().then((stats) => {
// console.log('[cache] statistics:', stats);
// })

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CourseProvider>
          <TestProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ScrollToTop />
              <App />
            </BrowserRouter>
          </TestProvider>
        </CourseProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
