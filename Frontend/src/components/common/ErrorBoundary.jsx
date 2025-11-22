import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, Mail, Bug } from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useContent } from "../../context/ContentContext";
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Store all error information including console logs
    const errorDetails = {
      errorId:
        this.state.errorId ||
        `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      // Capture recent console logs if available
      recentLogs: this.captureConsoleLogs(),
    };

    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorDetails: errorDetails, // NEW: Store for email reporting
    });

    // In production, send error to monitoring service
    if (process.env.NODE_ENV === "production") {
      console.error("Error logged to monitoring service:", errorDetails);
    }
  }

  // NEW METHOD: Capture recent console logs
  captureConsoleLogs = () => {
    try {
      // If you've implemented console log capture elsewhere, use it
      // Otherwise return placeholder
      return "Console logs captured at error time";
    } catch (e) {
      return "Unable to capture console logs";
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReportError = () => {
    // Get contact email from localStorage/context or use fallback
    const contentSettings = this.getContentSettings();
    const supportEmail =
      contentSettings?.contactInfo?.email?.support || "support@crazydukaan.store";

    // Comprehensive error report with ALL details
    const errorReport = {
      // Basic Info
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),

      // Error Details
      errorMessage: this.state.error?.message || "Unknown error",
      errorName: this.state.error?.name || "Error",
      errorStack: this.state.error?.stack || "No stack trace available",

      // Component Stack
      componentStack:
        this.state.errorInfo?.componentStack || "No component stack",

      // Environment
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,

      // User Info (if available)
      userId: localStorage.getItem("userId") || "Anonymous",
      userEmail: localStorage.getItem("userEmail") || "Not logged in",

      // Additional Context
      localStorage: this.getSafeLocalStorage(),
      consoleErrors: this.state.errorDetails?.recentLogs || "Not captured",
    };

    // Format email body for readability
    const emailBody = `
ERROR REPORT
============

Error ID: ${errorReport.errorId}
Timestamp: ${errorReport.timestamp}

ERROR DETAILS
-------------
Message: ${errorReport.errorMessage}
Type: ${errorReport.errorName}

Stack Trace:
${errorReport.errorStack}

Component Stack:
${errorReport.componentStack}

ENVIRONMENT
-----------
URL: ${errorReport.url}
User Agent: ${errorReport.userAgent}
Viewport: ${errorReport.viewport}

USER INFO
---------
User ID: ${errorReport.userId}
Email: ${errorReport.userEmail}

ADDITIONAL DATA
---------------
${JSON.stringify(errorReport.localStorage, null, 2)}

Console Logs:
${errorReport.consoleErrors}
`;

    const mailtoLink = `mailto:${supportEmail}?subject=Error Report ${
      this.state.errorId
    }&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  // NEW METHOD: Safely get localStorage data
  getSafeLocalStorage = () => {
    try {
      const storage = {};
      const sensitiveKeys = ["password", "token", "secret", "auth"];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Skip sensitive data
        if (!sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          storage[key] = localStorage.getItem(key)?.substring(0, 100); // Limit length
        }
      }
      return storage;
    } catch (e) {
      return { error: "Could not access localStorage" };
    }
  };

  // NEW METHOD: Get content settings from localStorage fallback
  getContentSettings = () => {
    try {
      const settings = localStorage.getItem("contentSettings");
      return settings ? JSON.parse(settings) : null;
    } catch (e) {
      return null;
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl w-full"
          >
            <Card className="p-8 shadow-xl border-2 border-red-100 dark:border-red-900/30">
              {/* Error Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                }}
                className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <AlertTriangle className="w-10 h-10 text-white" />
              </motion.div>

              {/* Error Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Something Went Wrong
                </h1>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                  We encountered an unexpected error. Don't worry, our team has
                  been notified and is working to fix this issue.
                </p>
              </motion.div>

              {/* Error ID Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center">
                    <Bug className="w-4 h-4 mr-2" />
                    Error ID:
                  </span>
                  <code className="text-red-600 dark:text-red-400 font-mono bg-white dark:bg-gray-900 px-3 py-1 rounded">
                    {this.state.errorId}
                  </code>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6"
              >
                <Button
                  onClick={this.handleReload}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full cursor-pointer"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </motion.div>

              {/* Report Error Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={this.handleReportError}
                  variant="ghost"
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Report This Error
                </Button>
              </motion.div>

              {/* Helpful Tips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Quick Fixes to Try:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                    <span>Clear your browser cache and cookies</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                    <span>Try using a different browser</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                    <span>Check your internet connection</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-1.5 flex-shrink-0" />
                    <span>Contact support if the issue persists</span>
                  </li>
                </ul>
              </motion.div>

              {/* Development Error Details */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <motion.details
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
                >
                  <summary className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 mb-3 flex items-center">
                    <Bug className="w-4 h-4 mr-2" />
                    Developer Details
                  </summary>
                  <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-auto max-h-60 border border-red-500/20">
                    <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
                      <div className="font-bold mb-2 text-red-300">
                        Error Message:
                      </div>
                      {this.state.error.toString()}

                      <div className="font-bold mt-4 mb-2 text-red-300">
                        Component Stack:
                      </div>
                      {this.state.errorInfo?.componentStack}

                      <div className="font-bold mt-4 mb-2 text-red-300">
                        Stack Trace:
                      </div>
                      {this.state.error.stack}
                    </pre>
                  </div>
                </motion.details>
              )}
            </Card>

{/* Support Contact */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6"
            >
              Need help? Contact us at{' '}
              <a 
                href={`mailto:${this.getContentSettings()?.contactInfo?.email?.support || 'support@crazydukaan.store'}`}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {this.getContentSettings()?.contactInfo?.email?.support || 'support@crazydukaan.store'}
              </a>
            </motion.p>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
