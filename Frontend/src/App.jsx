/**
 * defines the public vidhgrow routes, protected views, layout shells, and shared page flow
 *
 * @file frontend/src/app.jsx
 * @module frontend/src/app
 * @exports root app component consumed by main.jsx
 */

import React, { Suspense, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { ContentProvider } from "./context/ContentContext";
import { Toaster } from "react-hot-toast";
import {
  Brain,
  Award,
  Target,
  Trophy,
  Lightbulb,
  Code,
  BookOpen,
  FileText,
  PenLine,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  MessageSquareText,
  NotebookPen,
} from "lucide-react";
// components
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Loading from "./components/common/Loading";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { createHead, UnheadProvider } from "@unhead/react/client";
import BlockedPage from "./pages/BlockedPage";
import CookieConsent from "./components/common/CookieConsent";
import TeacherOrUserProfile from "./pages/TeacherOrUserProfile";

// lazy loaded for better performance
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Courses = React.lazy(() => import("./pages/Courses"));
const Test = React.lazy(() => import("./pages/Test"));
const TestSeoPage = React.lazy(() => import("./pages/TestSeoPage"));
const Profile = React.lazy(() => import("./pages/Profile"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const TeacherJoin = React.lazy(() => import("./pages/TeacherJoin"));
const TeacherProfile = React.lazy(() => import("./pages/TeacherProfile"));
const PublicProfile = React.lazy(() => import("./pages/PublicProfile"));
const Contact = React.lazy(() => import("./pages/Contact"));
const About = React.lazy(() => import("./pages/About"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));

const head = createHead();
// page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.3,
};

// background elements component
const BackgroundElements = ({ animations, reducedMotion, disabled = false }) => {
  const layersRef = React.useRef(null);

  useEffect(() => {
    if (disabled) return;

    const isCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches || false;
    if (isCoarsePointer || reducedMotion || animations === false) return;

    let rafId = null;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (Math.abs(currentScrollY - lastScrollY) > 3) {
          const layers = layersRef.current;
          if (layers) {
            layers.style.setProperty("--vg-bg-a", `${currentScrollY * 0.08}px`);
            layers.style.setProperty("--vg-bg-b", `${currentScrollY * 0.22}px`);
            layers.style.setProperty("--vg-bg-c", `${currentScrollY * -0.14}px`);
          }
          lastScrollY = currentScrollY;
        }
        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [animations, disabled, reducedMotion]);

  if (disabled) return null;

  return (
    <div ref={layersRef} className="vg-bg-artifacts fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 vg-bg-layer vg-bg-layer-a">
        <div className="vg-artifact-grid vg-artifact-a" />
        <div className="vg-artifact-grid vg-artifact-f" />
        <div className="vg-artifact-mark vg-artifact-c" />
        <div className="vg-artifact-mark vg-artifact-i" />
      </div>

      <div className="absolute inset-0 vg-bg-layer vg-bg-layer-b">
        <div className="vg-artifact-sheet vg-artifact-b" />
        <div className="vg-artifact-sheet vg-artifact-d" />
        <span className="vg-artifact-rule vg-artifact-h" />
        <span className="vg-artifact-rule vg-artifact-l" />
      </div>

      <div className="absolute inset-0 vg-bg-layer vg-bg-layer-c">
        {animations !== false && !reducedMotion && (
          <>
            <motion.div className="vg-artifact-icon vg-artifact-g">
              <Brain />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-h">
              <Target />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-j">
              <Award />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-k">
              <Trophy />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-d">
              <Lightbulb />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-e">
              <Code />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-m">
              <BookOpen />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-n">
              <FileText />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-o">
              <PenLine />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-p">
              <BarChart3 />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-q">
              <CalendarCheck />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-r">
              <ClipboardList />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-s">
              <MessageSquareText />
            </motion.div>
            <motion.div className="vg-artifact-icon vg-artifact-t">
              <NotebookPen />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

const ProfileRouteGuard = () => {
  const { username } = useParams();

  // if username doesn't start with @, show 404
  if (!username.startsWith("@")) {
    return <NotFound />;
  }

  // strip @ and pass to publicprofile
  return <PublicProfile />;
};

/**
 * redirects the old plural teacher path while preserving search and hash state
 *
 * @returns {JSX.Element} redirect to the canonical teacher application route
 */
const LegacyTeacherRoute = () => {
  const location = useLocation();
  return <Navigate to={`/teacher${location.search}${location.hash}`} replace />;
};

function App() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const location = useLocation();
  const [ipBlocked, setIpBlocked] = useState(null); // null = not blocked, object = block info

  // intercept all axios/fetch errors globally for ip_blocked code
  useEffect(() => {
    const handleFetchError = async (e) => {
      // only intercept if response exists
    };

    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      if (res.status === 403) {
        try {
          const clone = res.clone();
          const data = await clone.json();
          if (data?.code === "IP_BLOCKED") {
            setIpBlocked({ expiresAt: data.expiresAt || null });
          }
        } catch (_) {}
      }
      return res;
    };

    return () => {
      window.fetch = origFetch;
    };
  }, []);

  // if ip is blocked, only show home and the blocked notice on other routes
  if (ipBlocked && location.pathname !== "/") {
    return (
      <UnheadProvider head={head}>
        <ErrorBoundary>
          <ContentProvider>
            <div className="bg-background text-foreground">
              <Header />
              <main className="relative z-10 min-h-screen">
                <BlockedPage expiresAt={ipBlocked.expiresAt} />
              </main>
            </div>
          </ContentProvider>
        </ErrorBoundary>
      </UnheadProvider>
    );
  }

  return (
    <UnheadProvider head={head}>
      <ErrorBoundary>
        <ContentProvider>
          <div className="vg-material-app bg-background text-foreground">
            {/* background elements - ed behind all content */}
            <BackgroundElements
              animations={animations}
              reducedMotion={reducedMotion}
            />

            {/* main application */}
            <div className="relative min-h-screen flex flex-col">
              <Header />

              <main className="vg-material-main relative z-10 flex-1">
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* public routes */}
                    <Route
                      path="/"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="page" />
                            </div>
                          }
                        >
                          <motion.div
                            key="home"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <Home />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/login"
                      element={
                        isAuthenticated ? (
                          <Navigate to="/" replace />
                        ) : (
                          <Suspense
                            fallback={
                              <div className="min-h-screen flex items-center justify-center pt-16">
                                <Loading variant="auth" />
                              </div>
                            }
                          >
                            <motion.div
                              key="login"
                              initial="initial"
                              animate="in"
                              exit="out"
                              variants={
                                animations && !reducedMotion ? pageVariants : {}
                              }
                              transition={
                                animations && !reducedMotion
                                  ? pageTransition
                                  : {}
                              }
                            >
                              <Login />
                            </motion.div>
                          </Suspense>
                        )
                      }
                    />

                    <Route
                      path="/register"
                      element={
                        isAuthenticated ? (
                          <Navigate to="/" replace />
                        ) : (
                          <Suspense
                            fallback={
                              <div className="min-h-screen flex items-center justify-center pt-16">
                                <Loading variant="auth" />
                              </div>
                            }
                          >
                            <motion.div
                              key="register"
                              initial="initial"
                              animate="in"
                              exit="out"
                              variants={
                                animations && !reducedMotion ? pageVariants : {}
                              }
                              transition={
                                animations && !reducedMotion
                                  ? pageTransition
                                  : {}
                              }
                            >
                              <Register />
                            </motion.div>
                          </Suspense>
                        )
                      }
                    />
                    {/* student public profile routes */}
                    <Route
                      path="/profile/:username"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <PublicProfile />
                        </Suspense>
                      }
                    />

                    {/* shared username route */}
                    <Route
                      path="/:username"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <TeacherOrUserProfile />
                        </Suspense>
                      }
                    />

                    {/* static pages */}
                    <Route
                      path="/contact"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <motion.div
                            key="contact"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <Contact />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/about"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <motion.div
                            key="about"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <About />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/privacy"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <motion.div
                            key="privacy"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <PrivacyPolicy />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/terms"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <motion.div
                            key="terms"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <TermsOfService />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    {/* protected routes */}
                    <Route
                      path="/courses"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="page" />
                            </div>
                          }
                        >
                          <motion.div
                            key="courses"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <Courses />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/tests"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="page" />
                            </div>
                          }
                        >
                          <motion.div
                            key="test-index"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <TestSeoPage />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/tests/:slug"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="page" />
                            </div>
                          }
                        >
                          <motion.div
                            key="test-seo"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <TestSeoPage />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/app/test/:courseId"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="test" />
                            </div>
                          }
                        >
                          <motion.div
                            key="test"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <Test />
                          </motion.div>
                        </Suspense>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Suspense
                            fallback={
                              <div className="min-h-screen pt-16">
                                <Loading variant="profile" />
                              </div>
                            }
                          >
                            <motion.div
                              key="profile"
                              initial="initial"
                              animate="in"
                              exit="out"
                              variants={
                                animations && !reducedMotion ? pageVariants : {}
                              }
                              transition={
                                animations && !reducedMotion
                                  ? pageTransition
                                  : {}
                              }
                            >
                              <Profile />
                            </motion.div>
                          </Suspense>
                        </ProtectedRoute>
                      }
                    />

                    {/* teacher routes */}
                    <Route path="/teachers" element={<LegacyTeacherRoute />} />
                    <Route
                      path="/teacher"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <TeacherJoin />
                        </Suspense>
                      }
                    />

                    <Route
                      path="/teacher/:username"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <TeacherProfile />
                        </Suspense>
                      }
                    />

                    {/* 404 route */}
                    <Route
                      path="*"
                      element={
                        <Suspense
                          fallback={
                            <div className="min-h-screen pt-16">
                              <Loading variant="page" />
                            </div>
                          }
                        >
                          <motion.div
                            key="404"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={
                              animations && !reducedMotion ? pageVariants : {}
                            }
                            transition={
                              animations && !reducedMotion ? pageTransition : {}
                            }
                          >
                            <NotFound />
                          </motion.div>
                        </Suspense>
                      }
                    />
                  </Routes>
                </AnimatePresence>
              </main>
              {!location.pathname.includes("/app/test") &&
                !location.pathname.includes("/login") &&
                !location.pathname.includes("/register") && <Footer />}
            </div>

            <CookieConsent />
            <Toaster
              position="bottom-center"
              limit={1}
              toastOptions={{
                duration: 3000,
                style: {
                  background: "rgba(15, 23, 42, 0.9)",
                  color: "#fff",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: "12px",
                  backdropFilter: "blur(16px)",
                  fontSize: "14px",
                },
                success: {
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#fff",
                  },
                  duration: 2000, // shorter for success
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                  duration: 4000, // longer for errors
                },
                // prevent duplicate toasts
                id: "unique-toast",
              }}
              gutter={8}
              containerStyle={{
                bottom: 20,
              }}
              reverseOrder={false}
            />
          </div>
        </ContentProvider>
      </ErrorBoundary>
    </UnheadProvider>
  );
}

export default App;
