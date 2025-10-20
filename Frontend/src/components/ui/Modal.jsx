import React, { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "./Button";

// Focus trap hook
const useFocusTrap = (isOpen, containerRef) => {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Save current focus
    previousFocusRef.current = document.activeElement;

    // Get focusable elements
    const getFocusableElements = () => {
      const focusableSelectors = [
        "button:not([disabled])",
        "input:not([disabled])",
        "textarea:not([disabled])",
        "select:not([disabled])",
        "a[href]",
        '[tabindex]:not([tabindex="-1"])',
      ].join(", ");

      return container.querySelectorAll(focusableSelectors);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();

    // Add event listener
    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, containerRef]);
};

// Advanced Modal Component
const Modal = ({
  isOpen = false,
  onClose,
  children,
  title = "",
  description = "",
  size = "md",
  variant = "default",
  closable = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventBodyScroll = true,
  blur = true,
  animate = true,
  className = "",
  overlayClassName = "",
  contentClassName = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  style = {},
  overlayStyle = {},
  contentStyle = {},
  onOpen,
  onAfterOpen,
  onAfterClose,
  ...rest
}) => {
  const { theme, animations, reducedMotion, getPrimaryColorClasses } =
    useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  // Enable focus trap
  useFocusTrap(isOpen, modalRef);

  // Mount/unmount effect
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle open/close side effects
  // Handle open/close side effects
  useEffect(() => {
    if (isOpen) {
      onOpen?.();

      // Prevent body scroll
      if (preventBodyScroll) {
        document.body.style.overflow = "hidden";
      }

      // Call after open callback
      const timer = setTimeout(() => {
        onAfterOpen?.();
      }, 200);

      // Cleanup function that ALWAYS runs when effect cleans up or component unmounts
      return () => {
        clearTimeout(timer);
        // Always restore scroll when modal closes or component unmounts
        if (preventBodyScroll) {
          document.body.style.overflow = "";
        }
      };
    } else {
      // Modal is closed, ensure body scroll is restored
      if (preventBodyScroll) {
        document.body.style.overflow = "";
      }

      // Call after close callback
      const timer = setTimeout(() => {
        onAfterClose?.();
      }, 200);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOpen, preventBodyScroll, onOpen, onAfterOpen, onAfterClose]);

  // Safety cleanup on component unmount
  useEffect(() => {
    return () => {
      // Ensure body scroll is always restored when modal component unmounts
      document.body.style.overflow = "";
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (event) => {
      if (!closeOnOverlay || !closable) return;
      if (event.target === overlayRef.current) {
        onClose?.();
      }
    },
    [closeOnOverlay, closable, onClose]
  );

  // Handle close button click
  const handleCloseClick = useCallback(() => {
    if (closable) {
      onClose?.();
    }
  }, [closable, onClose]);

  // Get size classes
  const getSizeClasses = () => {
    const sizes = {
      xs: "max-w-xs",
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      "5xl": "max-w-5xl",
      "6xl": "max-w-6xl",
      "7xl": "max-w-7xl",
      full: "max-w-full",
    };
    return sizes[size] || sizes.md;
  };

  // Get variant classes
  const getVariantClasses = () => {
    const variants = {
      default: [
        "bg-white",
        "dark:bg-slate-800",
        "border",
        "border-gray-200",
        "dark:border-slate-700",
        "shadow-2xl",
      ],
      success: [
        "bg-white",
        "dark:bg-slate-800",
        "border-l-4",
        "border-l-green-500",
        "border-t",
        "border-r",
        "border-b",
        "border-gray-200",
        "dark:border-slate-700",
        "shadow-2xl",
      ],
      warning: [
        "bg-white",
        "dark:bg-slate-800",
        "border-l-4",
        "border-l-yellow-500",
        "border-t",
        "border-r",
        "border-b",
        "border-gray-200",
        "dark:border-slate-700",
        "shadow-2xl",
      ],
      danger: [
        "bg-white",
        "dark:bg-slate-800",
        "border-l-4",
        "border-l-red-500",
        "border-t",
        "border-r",
        "border-b",
        "border-gray-200",
        "dark:border-slate-700",
        "shadow-2xl",
      ],
      glass: [
        "bg-white/80",
        "dark:bg-slate-800/80",
        "backdrop-blur-xl",
        "border",
        "border-white/20",
        "dark:border-slate-700/50",
        "shadow-2xl",
      ],
    };

    return variants[variant] || variants.default;
  };

  // Animation variants
  const overlayVariants = {
    hidden: {
      opacity: 0,
      backdropFilter: blur ? "blur(0px)" : "none",
    },
    visible: {
      opacity: 1,
      backdropFilter: blur ? "blur(8px)" : "none",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      backdropFilter: blur ? "blur(0px)" : "none",
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
        delay: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  if (!isMounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={style}
          {...rest}
        >
          {/* Overlay */}
          <motion.div
            ref={overlayRef}
            className={`
              fixed inset-0 bg-black/50 dark:bg-black/70
              ${overlayClassName}
            `}
            style={overlayStyle}
            variants={animate && !reducedMotion ? overlayVariants : {}}
            initial={animate && !reducedMotion ? "hidden" : false}
            animate={animate && !reducedMotion ? "visible" : false}
            exit={animate && !reducedMotion ? "exit" : false}
            onClick={handleOverlayClick}
          />

          {/* Content */}
          <motion.div
            ref={contentRef}
            className={`
              relative w-full mx-auto
              ${getSizeClasses()}
              ${getVariantClasses().join(" ")}
              rounded-xl
              ${contentClassName}
              ${className}
            `}
            style={contentStyle}
            variants={animate && !reducedMotion ? contentVariants : {}}
            initial={animate && !reducedMotion ? "hidden" : false}
            animate={animate && !reducedMotion ? "visible" : false}
            exit={animate && !reducedMotion ? "exit" : false}
          >
            {/* Header */}
            {(title || description || showCloseButton) && (
              <div
                className={`
                flex items-start justify-between p-6 pb-0
                ${headerClassName}
              `}
              >
                <div className="flex-1 pr-4">
                  {title && (
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {description}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                {showCloseButton && closable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseClick}
                    className="!p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div
              className={`
              p-6
              ${title || description ? "pt-4" : ""}
              ${bodyClassName}
            `}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

// Modal Header Component
const ModalHeader = ({ children, className = "", ...rest }) => (
  <div
    className={`
      flex items-start justify-between p-6 pb-4
      border-b border-gray-200 dark:border-slate-700
      ${className}
    `}
    {...rest}
  >
    {children}
  </div>
);

// Modal Title Component
const ModalTitle = ({ children, className = "", ...rest }) => (
  <h2
    className={`
      text-xl font-semibold text-gray-900 dark:text-slate-100
      ${className}
    `}
    {...rest}
  >
    {children}
  </h2>
);

// Modal Body Component
const ModalBody = ({ children, className = "", ...rest }) => (
  <div
    className={`
      p-6 text-gray-600 dark:text-slate-400
      ${className}
    `}
    {...rest}
  >
    {children}
  </div>
);

// Modal Footer Component
const ModalFooter = ({
  children,
  className = "",
  justify = "end",
  ...rest
}) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-6 pt-4
        border-t border-gray-200 dark:border-slate-700
        ${justifyClasses[justify] || justifyClasses.end}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};

// Confirmation Modal Component
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  ...rest
}) => {
  const handleConfirm = useCallback(async () => {
    if (onConfirm) {
      await onConfirm();
    }
  }, [onConfirm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      variant={variant}
      {...rest}
    >
      <ModalBody>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              {cancelText}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              onClick={handleConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

// Alert Modal Component
const AlertModal = ({
  isOpen,
  onClose,
  title = "Alert",
  message = "",
  variant = "default",
  buttonText = "OK",
  ...rest
}) => {
  const getIcon = () => {
    switch (variant) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "danger":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      variant={variant}
      {...rest}
    >
      <ModalBody>
        <div className="text-center">
          <div className="text-4xl mb-4">{getIcon()}</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-slate-400 mb-6">{message}</p>
          <Button variant="primary" onClick={onClose}>
            {buttonText}
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
};

// Compound exports
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
Modal.Confirm = ConfirmModal;
Modal.Alert = AlertModal;

export default Modal;
