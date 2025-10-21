import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Play, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCourses } from "../../context/CourseContext";
import { apiMethods } from "@/services/api";
import { useAuth } from "../../context/AuthContext";
import PaymentModal from "../payment/PaymentModal";
import toast from "react-hot-toast";

// Add this CSS
const expanderStyles = `
  .course-expander-content {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    margin-top: 0;
    transition: none;
  }

  .course-expander-content.expanded {
    max-height: 500px;
    opacity: 1;
    margin-top: 12px;
    transition: max-height 0.2s ease-out, opacity 0.2s ease-out, margin-top 0.2s ease-out;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleId = "course-expander-styles";
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement("style");
    styleTag.id = styleId;
    styleTag.textContent = expanderStyles;
    document.head.appendChild(styleTag);
  }
}

const CourseDetailsExpander = ({
  course,
  viewMode = "grid",
  onStatusChange,
  isExpanded: parentIsExpanded,
  onExpandChange,
}) => {
  const { isAuthenticated } = useAuth();
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [testAlreadyTaken, setTestAlreadyTaken] = useState(false);
  const [existingTestId, setExistingTestId] = useState(null);
  const navigate = useNavigate();
  const { calculateEstimatedTime } = useCourses();
  const contentRef = useRef(null);

  // Use parent's expanded state directly
  const actuallyExpanded = parentIsExpanded || false;

  const toggleExpanded = () => {
    const newState = !actuallyExpanded;

    if (onExpandChange) {
      onExpandChange(newState);
    }
  };

  useEffect(() => {
  }, [course._id, parentIsExpanded, actuallyExpanded]);

  // Check purchase status when component mounts
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!isAuthenticated || !course.isPaid) {
        setCheckingPurchase(false);
        return;
      }

      try {
        const response = await apiMethods.payments.checkPurchase(course._id);
        setHasPurchased(response.data.data.hasPurchased);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingPurchase(false);
      }
    };

    checkPurchaseStatus();
  }, [course._id, isAuthenticated, course.isPaid]);

  // Check if paid course test already taken
  useEffect(() => {
    const checkIfTestTaken = async () => {
      if (!isAuthenticated || !course.isPaid || !hasPurchased) {
        setTestAlreadyTaken(false);
        return;
      }

      try {
        const response = await apiMethods.tests.getHistory();
        const userTests = response.data.data.testHistory;

        const existingTest = userTests.find(
          (test) => test.course._id === course._id
        );

        if (existingTest) {
          setTestAlreadyTaken(true);
          setExistingTestId(existingTest._id);
        } else {
          setTestAlreadyTaken(false);
        }
      } catch (error) {
        console.error(error);
        setTestAlreadyTaken(false);
      }
    };

    checkIfTestTaken();
  }, [hasPurchased, course._id, isAuthenticated, course.isPaid]);

  const handleStartTest = () => {
    if (!isAuthenticated) {
      toast.error("Please login to take tests");
      navigate("/login", { state: { from: `/courses` } });
      return;
    }

    if (course.isPaid && !hasPurchased) {
      setShowPaymentModal(true);
      return;
    }

    if (course.isPaid && testAlreadyTaken && existingTestId) {
      navigate(`/app/test/${course._id}`);
      return;
    }

    navigate(`/app/test/${course._id}`);
  };

  const handlePaymentSuccess = () => {
    setHasPurchased(true);
    setShowPaymentModal(false);
    navigate(`/app/test/${course._id}`);
  };

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <Button
        onClick={toggleExpanded}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-center space-x-2 bg-white border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
      >
        <span className="text-sm">Details</span>
        <motion.div
          animate={{ rotate: actuallyExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </Button>

      {/* Expandable Content - Using CSS transition instead of Framer Motion */}
      <div
        ref={contentRef}
        className={`course-expander-content ${
          actuallyExpanded ? "expanded" : ""
        }`}
      >
        <div
          className={`${
            viewMode === "grid" ? "p-6" : "p-4"
          } bg-gray-50 rounded-lg border border-gray-200 space-y-4`}
        >
          {/* Stats Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Estimated Time:</span>
              <span className="text-gray-800 font-medium text-sm">
                {calculateEstimatedTime(course)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Questions:</span>
              <span className="text-gray-800 font-medium text-sm">
                {course.totalQuestions}
              </span>
            </div>
            <div>
              <span className="text-gray-600 text-sm block mb-2">Levels:</span>
              <div className="flex flex-wrap gap-1">
                {course.difficulties && course.difficulties.length > 0 ? (
                  course.difficulties.map((difficulty, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-gray-200 text-gray-800"
                    >
                      {difficulty.name}
                    </Badge>
                  ))
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-gray-200 text-gray-800"
                  >
                    All Levels
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-gray-600 text-sm">Overview:</span>
            <p
              className={`text-gray-800 mt-1 text-sm leading-relaxed ${
                viewMode === "grid" ? "text-base" : ""
              }`}
            >
              {course.description}
            </p>
          </div>

          <Button
            onClick={handleStartTest}
            disabled={checkingPurchase}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
          >
            {checkingPurchase ? (
              "Checking..."
            ) : course.isPaid && !hasPurchased ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Purchase for ₹{course.price}
              </>
            ) : course.isPaid && testAlreadyTaken ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                View Result
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        course={course}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default CourseDetailsExpander;
