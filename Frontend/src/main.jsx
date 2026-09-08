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
import Lenis from "lenis";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CourseProvider } from "./context/CourseContext.jsx";
import { TestProvider } from "./context/TestContext.jsx";
import { ThemeProvider, useTheme } from "./context/ThemeContext.jsx";
import "lenis/dist/lenis.css";
import "./styles/globals.css";

/**
 * keeps smooth scrolling native friendly and disables scroll hijacking on touch devices
 *
 * @returns {null} no markup because lenis only manages browser scrolling
 */
const SmoothScrollController = () => {
  const { animations = true, reducedMotion = false } = useTheme() || {};

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const isCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches || false;

    // native touch scrolling stays more responsive than a javascript scroll loop
    if (!animations || reducedMotion || isCoarsePointer) {
      document.documentElement.classList.remove("vg-lenis-ready");
      document.documentElement.classList.add("vg-native-scroll");
      return undefined;
    }

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      autoResize: true,
      gestureOrientation: "vertical",
      lerp: 0.22,
      smoothWheel: true,
      wheelMultiplier: 1.05,
      prevent: (node) =>
        Boolean(
          node?.closest?.(
            "[data-lenis-prevent], [role='dialog'], [data-radix-popper-content-wrapper], .vg-no-smooth-scroll",
          ),
        ),
    });

    window.__vidhgrowLenis = lenis;
    document.documentElement.classList.add("vg-lenis-ready");
    document.documentElement.classList.remove("vg-native-scroll");

    return () => {
      if (window.__vidhgrowLenis === lenis) {
        delete window.__vidhgrowLenis;
      }
      lenis.destroy();
      document.documentElement.classList.remove("vg-lenis-ready");
      document.documentElement.classList.remove("vg-native-scroll");
    };
  }, [animations, reducedMotion]);

  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const lenis = window.__vidhgrowLenis;
    if (lenis?.scrollTo) {
      lenis.scrollTo(0, { immediate: true });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
              <SmoothScrollController />
              <ScrollToTop />
              <App />
            </BrowserRouter>
          </TestProvider>
        </CourseProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
