import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import RichTextRenderer from "../plugins/RichTextRenderer";

const TestQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  isAnswered,
}) => {
  const [localSelectedAnswer, setLocalSelectedAnswer] =
    useState(selectedAnswer);
  const [feedback, setFeedback] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleAnswerSelect = async (answer) => {
    // CHANGE: Prevent multiple submissions
    if (isLocked || isValidating) return;

    setIsLocked(true);
    setIsValidating(true); // NEW: Show loading state
    setLocalSelectedAnswer(answer);

    try {
      const result = await onAnswerSelect(answer);

      if (result?.feedback) {
        setFeedback(result.feedback);
        setFeedbackShown(true); // NEW: Track feedback display

        // CHANGE: Notify parent that validation is complete
        if (result.feedback.isCorrect) {
          // Auto-advance after 1.5 seconds for correct answers
          setTimeout(() => {
            setIsLocked(false);
            setIsValidating(false);
          }, 1500);
        } else {
          // Keep locked longer for wrong answers (show explanation)
          setTimeout(() => {
            setIsLocked(false);
            setIsValidating(false);
          }, 2500);
        }
      }
    } catch (error) {
      console.error("Answer validation failed:", error);
      // CHANGE: Unlock on error to allow retry
      setIsLocked(false);
      setIsValidating(false);
    }
  };

  // Reset when question changes
  useEffect(() => {
    setLocalSelectedAnswer(selectedAnswer);
    setFeedback(null);
    setFeedbackShown(false);
    setIsLocked(false);
    setIsValidating(false); // NEW: Reset validation state
  }, [question._id, selectedAnswer]);

  if (!question) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mx-4 md:mx-auto p-6 text-center border-red-200">
          <p className="text-red-600 font-medium">No question data available</p>
        </Card>
      </div>
    );
  }

  const getOptionStyle = (optionIndex) => {
    const isSelected = localSelectedAnswer === optionIndex;

    // Show immediate feedback after answer selection
    if (feedback && isSelected) {
      const isCorrect = feedback.isCorrect;
      if (isCorrect) {
        return "p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left w-full border-green-500 bg-green-50 dark:bg-green-950 ring-2 ring-green-200 dark:ring-green-800";
      } else {
        return "p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left w-full border-red-500 bg-red-50 dark:bg-red-950 ring-2 ring-red-200 dark:ring-red-800";
      }
    }

    // Show correct answer after feedback (if provided)
    if (feedback && feedback.correctAnswer !== undefined) {
      const isCorrect = optionIndex === feedback.correctAnswer;
      if (isCorrect && !isSelected) {
        return "p-4 border rounded-lg text-left w-full border-green-500 bg-green-50 dark:bg-green-950 ring-2 ring-green-200 dark:ring-green-800";
      }
    }

    if (!feedback) {
      // During test - show selection state
      return cn(
        "p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left w-full",
        "hover:bg-gray-50 dark:hover:bg-gray-800",
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-200 dark:ring-blue-800"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      );
    }

    // Default style for non-selected options with feedback
    return "p-4 border rounded-lg text-left w-full border-gray-200 dark:border-gray-700";
  };

  const ImageModal = () => {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.5, Math.min(prev + delta, 3)));
    };

    const handleMouseDown = (e) => {
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging && zoom > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleZoomIn = () => {
      setZoom((prev) => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
      setZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleReset = () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };

    useEffect(() => {
      if (isDragging) {
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };
      }
    }, [isDragging, dragStart, zoom]);

    return showImageModal ? (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={() => {
          setShowImageModal(false);
          handleReset();
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            setShowImageModal(false);
            handleReset();
          }}
          className="absolute top-4 right-4 z-[100000] text-white bg-black/70 hover:bg-black/90 rounded-full p-3 transition-all duration-200 hover:scale-110"
          aria-label="Close image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[100000] flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="text-white hover:text-blue-400 transition-colors p-2"
            aria-label="Zoom out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>

          <span className="text-white text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="text-white hover:text-blue-400 transition-colors p-2"
            aria-label="Zoom in"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-white/30 mx-1" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="text-white hover:text-blue-400 transition-colors text-sm px-2"
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>

        {/* Image Container */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
        >
          <img
            src={question.image.url || question.image}
            alt="Question illustration"
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${
                position.y / zoom
              }px)`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
              cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            onMouseDown={handleMouseDown}
            draggable={false}
          />
        </div>

        {/* Hint Text */}
        {zoom === 1 && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[100000] bg-black/70 backdrop-blur-md rounded-full px-4 py-2 text-white text-sm">
            Scroll to zoom • Drag to pan
          </div>
        )}
      </div>
    ) : null;
  };

  const renderQuestionContent = () => {
    const questionType = question.questionType || "multiple";

    switch (questionType) {
      case "multiple":
      case "truefalse":
        const options = question.options || [];

        if (options.length === 0) {
          return (
            <div className="p-4 text-center text-gray-500">
              No options available for this question
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index}>
                <button
                  onClick={() => handleAnswerSelect(index)}
                  className={getOptionStyle(index)}
                  disabled={!!feedback} // Disable after feedback
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1 text-left">{option}</span>
                    {feedback && (
                      <div className="ml-4 flex-shrink-0">
                        {localSelectedAnswer === index &&
                          feedback.isCorrect && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        {localSelectedAnswer === index &&
                          !feedback.isCorrect && (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        {feedback.correctAnswer === index &&
                          localSelectedAnswer !== index && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        );

      case "single":
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={localSelectedAnswer || ""}
                onChange={(e) => setLocalSelectedAnswer(e.target.value)}
                placeholder="Enter your answer..."
                className={cn(
                  "flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent",
                  feedback
                    ? feedback.isCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-950 focus:ring-green-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500" // Don't highlight wrong answers
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
                disabled={!!feedback}
              />
              <Button
                onClick={() => handleAnswerSelect(localSelectedAnswer)}
                disabled={
                  !String(localSelectedAnswer || "").trim() || !!feedback
                }
                className="px-6 cursor-pointer w-full sm:w-auto"
              >
                Submit
              </Button>
            </div>

            {feedback && (
              <div className="space-y-3">
                <Alert
                  className={
                    feedback.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  <div className="flex items-center">
                    {feedback.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 mr-2" />
                    )}
                    <AlertDescription>
                      {feedback.isCorrect ? "Correct!" : "Incorrect"}
                    </AlertDescription>
                  </div>
                </Alert>

                {!feedback.isCorrect && feedback.correctAnswer && (
                  <div className="p-3 border border-green-200 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium text-green-700 dark:text-green-300"></span>
                      <span className="text-green-600 dark:text-green-400">
                        {feedback.correctAnswer}
                      </span>
                    </div>
                  </div>
                )}

                {feedback.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <AlertDescription>
                        <strong>Explanation:</strong> {feedback.explanation}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 text-center text-red-500">
            Unsupported question type: {questionType}
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mx-4 md:mx-auto overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        <div className="p-6">
          {/* Question Title */}
          <div className="mb-4">
            <RichTextRenderer
              content={question.question || "Question text not available"}
              className="text-xl font-semibold"
            />
          </div>

          {/* Question Image */}
          {question.image && (
            <div
              className="mb-6 cursor-pointer flex justify-center"
              onClick={() => setShowImageModal(true)}
            >
              <div className="w-full max-w-2xl group">
                <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-600 transition-all duration-200 group-hover:border-blue-400 group-hover:shadow-lg">
                  <img
                    src={question.image.url || question.image}
                    alt="Question illustration"
                    className="w-full h-auto max-h-96 sm:max-h-[500px] object-contain bg-gray-50 dark:bg-gray-900 group-hover:opacity-90 transition-opacity duration-200"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center group-hover:text-blue-500 transition-colors duration-200">
                  Click to enlarge
                </p>
              </div>
            </div>
          )}

          {/* Answer Options */}
          <div className="mb-6">{renderQuestionContent()}</div>

          {/* Answer Status */}
          <div className="text-center">
            {feedback ? (
              <span
                className={cn(
                  "flex items-center justify-center text-sm font-medium",
                  feedback.isCorrect
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {feedback.isCorrect ? (
                  <>Correct Answer!</>
                ) : (
                  <>Incorrect Answer</>
                )}
              </span>
            ) : isAnswered ? (
              <span className="flex items-center justify-center text-green-600 dark:text-green-400 text-sm"></span>
            ) : (
              <span className="text-gray-500 text-sm">
                Please select an answer
              </span>
            )}
          </div>
        </div>
      </Card>
      <ImageModal />
    </div>
  );
};

export default TestQuestion;
