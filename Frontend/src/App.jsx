import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { ContentProvider } from "./context/ContentContext";
import { Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import {
  Brain,
  BookOpen,
  Award,
  Target,
  Trophy,
  Zap,
  Lightbulb,
  Rocket,
  Sparkles,
  Globe,
  Heart,
  Code,
} from "lucide-react";
// Components
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import Loading from "./components/common/Loading";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { createHead, UnheadProvider } from "@unhead/react/client";
// Lazy loaded for better performance
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const Courses = React.lazy(() => import("./pages/Courses"));
const Test = React.lazy(() => import("./pages/Test"));
const Profile = React.lazy(() => import("./pages/Profile"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PublicProfile = React.lazy(() => import("./pages/PublicProfile"));
const Contact = React.lazy(() => import("./pages/Contact"));
const About = React.lazy(() => import("./pages/About"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));

const head = createHead();
// Page transition variants
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

// Background Elements Component
const BackgroundElements = ({ animations, reducedMotion }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId = null;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        // Only update if scroll changed significantly (reduces re-renders)
        if (Math.abs(currentScrollY - lastScrollY) > 5) {
          setScrollY(currentScrollY);
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
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Layer 1 - Slowest background blobs */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${scrollY * 0.1}px, 0)`,
          willChange: "transform",
        }}
      >
        <div className="absolute top-20 left-[5%] w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 bg-gradient-to-br from-primary/45 to-purple-500/50 rounded-full blur-sm opacity-95" />
        <div className="absolute top-72 right-[8%] w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 bg-gradient-to-br from-blue-500/35 to-cyan-500/40 rounded-full blur-sm opacity-90" />
        <div className="absolute top-[35vh] left-[55%] w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 xl:w-64 xl:h-64 bg-gradient-to-br from-green-500/35 to-emerald-500/40 rounded-full blur-sm opacity-90" />
        <div className="absolute top-[55vh] right-[20%] w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72 bg-gradient-to-br from-yellow-500/35 to-orange-500/40 rounded-full blur-sm opacity-90" />
        <div className="absolute top-[75vh] left-[25%] w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 bg-gradient-to-br from-pink-500/35 to-red-500/40 rounded-full blur-sm opacity-95" />
      </div>

      {/* Layer 2 - Medium speed elements */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${scrollY * 0.3}px, 0)`,
          willChange: "transform",
        }}
      >
        <div className="absolute top-[20vh] left-[70%] w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-48 xl:h-48 bg-gradient-to-br from-teal-500/20 to-blue-500/25 rounded-full blur-sm opacity-40" />
        <div className="absolute top-[40vh] right-[35%] w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/25 rounded-full blur-sm opacity-45" />
        <div className="absolute top-[60vh] left-[15%] w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 xl:w-52 xl:h-52 bg-gradient-to-br from-orange-500/20 to-yellow-500/25 rounded-full blur-sm opacity-35" />
        <div className="absolute bottom-40 right-[45%] w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 bg-gradient-to-br from-green-500/20 to-teal-500/25 rounded-full blur-sm opacity-50" />
      </div>

      {/* Layer 3 - Fast moving accent elements */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${scrollY * 0.6}px, 0)`,
          willChange: "transform",
        }}
      >
        <div className="absolute top-28 right-[15%] w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-cyan-500/30 to-blue-500/35 rounded-full blur-sm opacity-30" />
        <div className="absolute top-[30vh] left-[40%] w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-gradient-to-br from-red-500/30 to-pink-500/35 rounded-full blur-sm opacity-35" />
        <div className="absolute top-[50vh] right-[55%] w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 xl:w-32 xl:h-32 bg-gradient-to-br from-green-500/30 to-emerald-500/35 rounded-full blur-sm opacity-25" />
        <div className="absolute bottom-28 left-[60%] w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 xl:w-20 xl:h-20 bg-gradient-to-br from-purple-500/30 to-violet-500/35 rounded-full blur-sm opacity-40" />
      </div>

      {/* Layer 4 - Reverse direction floating icons */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${scrollY * -0.2}px, 0)`,
          willChange: "transform",
        }}
      >
        {animations !== false && !reducedMotion && (
          <>
            <motion.div
              className="absolute top-32 left-[8%] w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-primary"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Brain className="w-full h-full drop-shadow-lg" />
            </motion.div>
            <motion.div
              className="absolute top-20 right-[5%] w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-green-500"
              animate={{
                rotate: [0, 360],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            >
              <Award className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-64 left-[85%] w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-cyan-500"
              animate={{
                y: [0, -15, 0],
                rotate: [0, 45, -45, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.2,
              }}
            >
              <Sparkles className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute bottom-20 left-[5%] w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-amber-500"
              animate={{
                rotate: [0, 180, 360],
                y: [0, -18, 0],
              }}
              transition={{
                duration: 6.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2.8,
              }}
            >
              <Rocket className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-[75vh] right-[8%] w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 text-violet-500"
              animate={{
                x: [0, 15, -15, 0],
                rotate: [0, 90, -90, 0],
              }}
              transition={{
                duration: 7.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3.5,
              }}
            >
              <Globe className="w-full h-full drop-shadow-lg" />
            </motion.div>
          </>
        )}
      </div>

      {/* Layer 5 - More floating icons with different speeds */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${scrollY * 0.4}px, 0)`,
          willChange: "transform",
        }}
      >
        {animations !== false && !reducedMotion && (
          <>
            <motion.div
              className="absolute top-[200px] left-[20%] w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-blue-500"
              animate={{
                y: [0, -30, 0],
                rotate: [0, 45, -45, 0],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            >
              <Target className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-[300px] right-[30%] w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 text-purple-500"
              animate={{
                rotate: [0, 360],
                x: [0, 20, -20, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
                delay: 1.5,
              }}
            >
              <Trophy className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-[450px] left-[80%] w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-orange-500"
              animate={{
                y: [0, -25, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2.2,
              }}
            >
              <Lightbulb className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-[380px] right-[55%] w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-teal-500"
              animate={{
                y: [0, -22, 0],
                rotate: [0, 120, -120, 0],
              }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.8,
              }}
            >
              <Zap className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute bottom-28 left-[90%] w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-pink-500"
              animate={{
                rotate: [0, 270, 360],
                y: [0, -15, 0],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 3,
              }}
            >
              <Heart className="w-full h-full drop-shadow-lg" />
            </motion.div>

            <motion.div
              className="absolute top-[120px] left-[40%] w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-indigo-500"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 60, -60, 0],
              }}
              transition={{
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            >
              <Code className="w-full h-full drop-shadow-lg" />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

// Add this BEFORE the App function
const ProfileRouteGuard = () => {
  const { username } = useParams();

  // If username doesn't start with @, show 404
  if (!username.startsWith("@")) {
    return <NotFound />;
  }

  // Strip @ and pass to PublicProfile
  return <PublicProfile />;
};

function App() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const location = useLocation();
  return (
    <UnheadProvider head={head}>
      <ErrorBoundary>
        <ContentProvider>
          <div className="bg-background text-foreground max-h-screen">
            {/* Background Elements - Fixed behind all content */}
            <BackgroundElements
              animations={animations}
              reducedMotion={reducedMotion}
            />

            {/* Main Application */}
            <div className="relative min-h-screen flex flex-col">
              <Header />

              <main className="relative z-10 flex-1 bg-background/80 backdrop-blur-10">
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* Public Routes */}
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
                    <Route
                      path="/:username"
                      element={
                        <Suspense fallback={<Loading variant="page" />}>
                          <ProfileRouteGuard />
                        </Suspense>
                      }
                    />

                    {/* Static Pages */}
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

                    {/* Protected Routes */}
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

                    {/* 404 Route */}
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

            <Toaster
              position="bottom-center"
              limit={1}
              toastOptions={{
                duration: 4000,
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
                  duration: 3000, // Shorter for success
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                  duration: 5000, // Longer for errors
                },
                // Prevent duplicate toasts
                id: "unique-toast",
              }}
              gutter={8}
              containerStyle={{
                bottom: 20,
              }}
              // Add this to prevent duplicates
              containerClassName="toast-container"
              reverseOrder={false}
            />
          </div>
        </ContentProvider>
      </ErrorBoundary>
    </UnheadProvider>
  );
}

export default App;
