import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import {
  HomeIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { useContent } from "../context/ContentContext";
import { useSEO } from "../hooks/useSEO";
const NotFound = () => {
  const { theme, animations, reducedMotion, getPrimaryColorClasses } =
    useTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const { contentSettings } = useContent();
  
  const primaryColors = getPrimaryColorClasses();
  const isDark = theme === "dark";

    useSEO({
    title: '404 - Page Not Found',
    description: `The page you're looking for doesn't exist on ${contentSettings?.siteName || 'TestMaster Pro'}. Navigate back to our homepage or explore our courses.`,
    keywords: '404, page not found, error page, not found',
    type: 'website',
    noindex: true, // 404 pages should not be indexed
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '404 Not Found',
      description: 'Page not found',
      url: window.location.href,
      isPartOf: {
        '@type': 'WebSite',
        name: contentSettings?.siteName || 'TestMaster Pro',
        url: contentSettings?.siteUrl || window.location.origin
      }
    }
  });

  // Auto redirect countdown
  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate(isAuthenticated ? "/" : "/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, isAuthenticated, autoRedirect]);

  // Cancel auto redirect
  const handleCancelRedirect = () => {
    setAutoRedirect(false);
  };

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 50 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const bounceVariants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const floatVariants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-5 lg:px-7 py-11 sm:py-15 lg:py-19 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated background shapes */}
        {animations && !reducedMotion && (
          <>
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full"
              variants={floatVariants}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full"
              variants={floatVariants}
              initial="initial"
              animate="animate"
              style={{ animationDelay: "1s" }}
            />
            <motion.div
              className="absolute top-1/3 right-1/3 w-16 h-16 bg-green-500/10 rounded-full"
              variants={floatVariants}
              initial="initial"
              animate="animate"
              style={{ animationDelay: "2s" }}
            />
          </>
        )}
      </div>

      <motion.div
        className="max-w-2xl w-full text-center relative z-10 backdrop-blur-md bg-background/60 dark:bg-background/40 rounded-3xl p-8 border border-white/10 dark:border-white/5 shadow-2xl"
        variants={animations && !reducedMotion ? containerVariants : {}}
        initial="initial"
        animate="animate"
      >
        {/* 404 Number */}
        <motion.div
          className="relative mb-8"
          variants={animations && !reducedMotion ? bounceVariants : {}}
          initial="initial"
          animate="animate"
        >
          <h1
            className={`
            text-8xl sm:text-9xl lg:text-[12rem] font-black
            ${primaryColors.primary}
            select-none
            drop-shadow-2xl
          `}
          >
            404
          </h1>

          {/* Warning Icon */}
          <motion.div
            className="absolute -top-8 -right-8 sm:-top-12 sm:-right-12"
            animate={
              animations && !reducedMotion
                ? {
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ExclamationTriangleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500" />
          </motion.div>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-foreground/95 drop-shadow-sm">
            Oops! Page Not Found
          </h2>

          <p className="text-lg sm:text-xl mb-2 text-foreground/80 max-w-lg mx-auto drop-shadow-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <p className="text-base text-foreground/70 max-w-md mx-auto drop-shadow-sm">
            Don't worry, even the best students sometimes take a wrong turn!
          </p>
        </motion.div>

        {/* Auto Redirect Message */}
        {autoRedirect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/10 backdrop-blur-sm text-foreground/90"
          >
            <p className="text-sm font-medium">
              Redirecting to {isAuthenticated ? "Home" : "Login"} in{" "}
              <span
                className={`
                font-bold text-lg
                ${primaryColors.primary}
              `}
              >
                {countdown}
              </span>{" "}
              seconds
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelRedirect}
              className="mt-2 !text-foreground/90 hover:!bg-white/10 cursor-pointer backdrop-blur-sm"
            >
              Cancel Auto-redirect
            </Button>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {/* Go Home Button */}
          <Button
            as={Link}
            to={isAuthenticated ? "/" : "/login"}
            variant="primary"
            size="lg"
            leftIcon={<HomeIcon className="w-5 h-5" />}
            className="w-full sm:w-auto cursor-pointer"
            animate={true}
          >
            {isAuthenticated ? "Go Home" : "Go to Login"}
          </Button>

          {/* Go Back Button */}
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto cursor-pointer"
            animate={true}
          >
            Go Back
          </Button>

          {/* Browse Courses */}
          {isAuthenticated && (
            <Button
              as={Link}
              to="/courses"
              variant="outlined"
              size="lg"
              leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              className="w-full sm:w-auto cursor-pointer"
              animate={true}
            >
              Browse Courses
            </Button>
          )}
        </motion.div>

        {/* Help Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="mt-12 pt-8 border-t border-white/10 dark:border-white/5"
        >
          <p
            className={`
            text-sm mb-4
            ${isDark ? "text-slate-400" : "text-gray-500"}
          `}
          >
            Need help finding what you're looking for?
          </p>

          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link
              to="/courses"
              className="hover:underline transition-colors cursor-pointer text-primary/90 hover:text-primary drop-shadow-sm"
            >
              Browse All Courses
            </Link>

            <span className={isDark ? "text-slate-600" : "text-gray-300"}>
              •
            </span>

            <Link
              to="/contact"
              className="hover:underline transition-colors cursor-pointer text-primary/90 hover:text-primary drop-shadow-sm"
            >
              Contact Support
            </Link>

            <span className="text-foreground/40">•</span>

            <Link
              to="/help"
              className={`
                hover:underline transition-colors cursor-pointer
                ${primaryColors.primary}
              `}
            >
              Help Center
            </Link>
          </div>
        </motion.div>

        {/* Fun Facts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 p-6 rounded-xl bg-background/30 backdrop-blur-sm border border-white/10 dark:border-white/5 shadow-xl"
        >
          <h3
            className={`
            text-lg font-semibold mb-2
            ${isDark ? "text-slate-200" : "text-gray-800"}
          `}
          >
            💡 Did you know?
          </h3>
          <p
            className={`
            text-sm
            ${isDark ? "text-slate-400" : "text-gray-600"}
          `}
          >
            The HTTP 404 error was named after room 404 at CERN, where the first
            web server was located. When files couldn't be found, they'd say
            "404 - file not found"!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
