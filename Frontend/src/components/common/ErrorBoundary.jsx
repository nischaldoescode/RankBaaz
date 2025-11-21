import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Mail, Bug } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      console.error('Error logged to monitoring service:', {
        errorId: this.state.errorId,
        error: error.message,
        stack: errorInfo.componentStack
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const errorReport = {
      id: this.state.errorId,
      message: this.state.error?.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    const mailtoLink = `mailto:support@yourapp.com?subject=Error Report ${this.state.errorId}&body=${encodeURIComponent(JSON.stringify(errorReport, null, 2))}`;
    window.location.href = mailtoLink;
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
                  damping: 15
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
                  We encountered an unexpected error. Don't worry, our team has been notified and is working to fix this issue.
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
              {process.env.NODE_ENV === 'development' && this.state.error && (
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
                      <div className="font-bold mb-2 text-red-300">Error Message:</div>
                      {this.state.error.toString()}
                      
                      <div className="font-bold mt-4 mb-2 text-red-300">Component Stack:</div>
                      {this.state.errorInfo?.componentStack}
                      
                      <div className="font-bold mt-4 mb-2 text-red-300">Stack Trace:</div>
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
                href="mailto:support@yourapp.com" 
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                support@yourapp.com
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