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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  // Use parent's expanded state directly
  const actuallyExpanded = parentIsExpanded || false;

  const toggleExpanded = () => {
    const newState = !actuallyExpanded;

    if (onExpandChange) {
      onExpandChange(newState);
    }
  };

  useEffect(() => {}, [course._id, parentIsExpanded, actuallyExpanded]);

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
    // NEW: Grant session access
    sessionStorage.setItem(`test_access_${course._id}`, "granted");

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
      <Accordion
        type="single"
        collapsible
        value={actuallyExpanded ? "details" : ""}
        onValueChange={(value) => {
          if (onExpandChange) {
            onExpandChange(value === "details");
          }
        }}
      >
        <AccordionItem value="details" className="border-none">
          <AccordionTrigger className="w-full py-2 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors rounded-md hover:no-underline">
            <span className="text-sm font-medium">Details</span>
          </AccordionTrigger>

          <AccordionContent>
            <div
              className={`${
                viewMode === "grid" ? "p-6" : "p-4"
              } mt-3 bg-gray-50 rounded-lg border border-gray-200 space-y-4`}
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
                  <span className="text-gray-600 text-sm block mb-2">
                    Levels:
                  </span>
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

              {course.hasPdfExport && (
                <div className="mt-3 flex items-center space-x-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <svg
                    className="w-4 h-4 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    PDF export available after test completion
                  </span>
                </div>
              )}

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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
