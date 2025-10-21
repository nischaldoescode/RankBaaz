import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Save,
  X,
  Upload,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Plus,
  Trash2,
  Eye,
  Edit2,
  XCircle,
} from "lucide-react";
import { useAdmin } from "../contexts/AdminContext";
import RichTextRenderer from "../components/plugins/RichTextRenderer";

const AIPromptModal = ({
  showModal,
  setShowModal,
  localCourseName,
  setLocalCourseName,
  aiPromptCourseName,
  setAIPromptCourseName,
  generatedPrompt,
  setGeneratedPrompt,
  generateAIPrompt,
  localQuestionCount,
  setLocalQuestionCount,
  localIsPaid,
  setLocalIsPaid,
  localPrice,
  setLocalPrice,
  categories,
}) => {
  if (!showModal) return null;
  const inputRef = useRef(null);
  const [questionCount, setQuestionCount] = useState(localQuestionCount || 30);
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState("copy");
  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text">
              AI Course Generator Prompt
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="self-end sm:self-auto text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Course Name
              </label>
              <input
                ref={inputRef}
                value={localCourseName}
                onChange={(e) => {
                  e.preventDefault();
                  setLocalCourseName(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && localCourseName.trim()) {
                    e.preventDefault();
                    setAIPromptCourseName(localCourseName);
                    setGeneratedPrompt(
                      generateAIPrompt(localCourseName, localQuestionCount)
                    );
                    inputRef.current?.focus();
                  }
                }}
                onBlur={(e) => {
                  // console.log("Input lost focus"); // Debug line
                }}
                placeholder="Enter course name (e.g., JavaScript Fundamentals) and press Enter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base placeholder-gray-400"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Total Questions Count
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for backspace, otherwise parse to number
                  const numValue = value === "" ? "" : parseInt(value) || "";
                  setQuestionCount(numValue);
                  setLocalQuestionCount(numValue);
                }}
                placeholder="Enter total number of questions (e.g., 30)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base placeholder-gray-400"
                min="1"
                max="100"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Course Type
              </label>

              {/* Toggle Button */}
              <div className="relative inline-flex items-center bg-gray-200 rounded-full p-1 transition-all duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setLocalIsPaid(false);
                    setLocalPrice(0);
                  }}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    !localIsPaid
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Free
                </button>
                <button
                  type="button"
                  onClick={() => setLocalIsPaid(true)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                    localIsPaid
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>

            {/* Price input - remains exactly the same */}
            {localIsPaid && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={localPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for backspace, otherwise parse to float
                    setLocalPrice(value === "" ? "" : parseFloat(value) || "");
                  }}
                  placeholder="Enter price in INR"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-base placeholder-gray-400"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
            <button
              onClick={() => {
                if (localCourseName.trim()) {
                  setAIPromptCourseName(localCourseName);
                  setGeneratedPrompt(
                    generateAIPrompt(localCourseName, questionCount)
                  );
                }
              }}
              disabled={!localCourseName.trim()}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed cursor-pointer text-lg"
            >
              Generate AI Prompt
            </button>

            {generatedPrompt && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 shadow-inner border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Generated Prompt
                  </h3>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generatedPrompt);
                        setCopyStatus("copied");
                        setTimeout(() => setCopyStatus("copy"), 4000); // Reset after 4 seconds
                      } catch (err) {
                        setCopyStatus("error");
                        setTimeout(() => setCopyStatus("copy"), 4000);
                      }
                    }}
                    className={`w-full sm:w-auto px-4 py-2 font-semibold rounded-lg transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer ${
                      copyStatus === "copied"
                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        : copyStatus === "error"
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800"
                        : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                    }`}
                  >
                    {copyStatus === "copied" ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Copied!
                      </span>
                    ) : copyStatus === "error" ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11.586l-3-3a1 1 0 00-1.414 1.414L11.586 11H15z" />
                        </svg>
                        Copy to Clipboard
                      </span>
                    )}
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto shadow-sm">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                    {generatedPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateCourse = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [toast, setToast] = useState(null);
  const { createCourseWithQuestions } = useAdmin();
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);

  // Add these after your existing useState declarations (around line 15)
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [aiPromptCourseName, setAIPromptCourseName] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [localCourseName, setLocalCourseName] = useState("");
  const [localQuestionCount, setLocalQuestionCount] = useState(30);
  const [localIsPaid, setLocalIsPaid] = useState(false);
  const [localPrice, setLocalPrice] = useState(0);
  const [videoType, setVideoType] = useState("none"); // "none" | "course" | "difficulty"
  const [courseVideoLinks, setCourseVideoLinks] = useState([
    { url: "", title: "" },
  ]);
  const [difficultyVideoLinks, setDifficultyVideoLinks] = useState({
    easy: [{ url: "", title: "" }],
    medium: [{ url: "", title: "" }],
    hard: [{ url: "", title: "" }],
  });

  // Course Data
  const EXPECTED_FILE_FORMAT = `
FLEXIBLE FORMAT - Field names can be in any case with or without spaces/underscores:

COURSE NAME = Your Course Title Here
COURSE DESCRIPTION = Your detailed course description here
MAX MARKS = 100
CATEGORY = Optional Category Name (can be left empty)

DIFFICULTY LEVELS = easy,medium,hard

DIFFICULTY SETTINGS:
easy:
  marks per question = 2
  max questions = 10
  min time = 30
  max time = 60

medium:
  marks per question = 3
  max questions = 8
  min time = 45
  max time = 90

hard:
  marks per question = 5
  max questions = 6
  min time = 60
  max time = 120

QUESTIONS:
[EASY]
Q: What is 2 + 2?
TYPE: multiple
OPTIONS: 3,4,5,6
CORRECT: 1
EXPLANATION: 2 + 2 equals 4

Q: Is the sky blue?
TYPE: truefalse
CORRECT: 0
EXPLANATION: Yes, the sky appears blue due to light scattering

[MEDIUM]
Q: Explain photosynthesis
TYPE: single
ANSWER: Process where plants convert light energy to chemical energy
EXPLANATION: Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to produce glucose and oxygen

SUPPORTED FIELD VARIATIONS:
- Course Name: "course name", "coursename", "name", "title"
- Course Description: "course description", "description", "desc"
- Max Marks: "max marks", "maxmarks", "marks"
- Category: "category", "cat"
- Difficulty Levels: "difficulty levels", "difficulties", "levels"

QUESTION FIELD VARIATIONS:
- Q: "question", "q"
- TYPE: "type", "question type"
- OPTIONS: "options", "choices"
- CORRECT: "correct", "answer", "correct answer"
- EXPLANATION: "explanation", "explain"

Notes:
- Field names are case-insensitive
- Spaces and underscores are ignored
- For multiple choice: OPTIONS separated by commas, CORRECT is index (0-based)
- For true/false: CORRECT is 0 for True, 1 for False
- For single answer: use ANSWER instead of OPTIONS
- Each question must have EXPLANATION
- Difficulty levels in brackets: [EASY], [MEDIUM], [HARD]
`;
  const generateAIPrompt = (courseName, QuestionCount) => {
    // Handle empty string or invalid question count
    const validQuestionCount =
      QuestionCount === "" || !QuestionCount ? 30 : Number(QuestionCount);

    const availableCategories =
      contextCategories && contextCategories.length > 0
        ? contextCategories.map((cat) => cat.name).join(", ")
        : "";

    const categoryInstruction = availableCategories
      ? `[Choose from: ${availableCategories}] (Optional - leave empty if none suitable)`
      : "[Optional - leave empty if no specific category]";

    return `Create a comprehensive course structure for "${courseName}" in the following format:

COURSE NAME = ${courseName}
COURSE DESCRIPTION = [Write a detailed 2-3 sentence description of what students will learn]
MAX MARKS = [Set total marks between 30-100, ensure it matches the sum of all difficulty level marks]
CATEGORY = ${categoryInstruction}
IS PAID = ${localIsPaid ? "true" : "false"}${
      localIsPaid
        ? `
PRICE = ${localPrice}`
        : ""
    }

DIFFICULTY LEVELS = easy,medium,hard

DIFFICULTY SETTINGS:
easy:
  marks per question = [1-3 marks per question]
  max questions = [Calculate between 40-70% of ${QuestionCount}, but ensure marks per question × max questions doesn't exceed 40% of MAX MARKS]
  min time = [1 seconds]
  max time = [60-120 seconds]

medium:
  marks per question = [3-5 marks per question]
  max questions = [Calculate between 20-50% of ${QuestionCount}, but ensure marks per question × max questions doesn't exceed 40% of MAX MARKS]
  min time = [1 seconds] 
  max time = [90-180 seconds]

hard:
  marks per question = [5-10 marks per question]
  max questions = [Calculate between 5-30% of ${QuestionCount}, but ensure marks per question × max questions doesn't exceed 30% of MAX MARKS]
  min time = [60-120 seconds]
  max time = [120-300 seconds]

IMPORTANT CALCULATION RULE:
- Sum of (marks per question × max questions) for ALL difficulties must EXACTLY equal MAX MARKS
- Example: If MAX MARKS = 90, then:
  - Easy: 2 marks × 15 questions = 30 marks
  - Medium: 3 marks × 10 questions = 30 marks
  - Hard: 6 marks × 5 questions = 30 marks
  - Total = 90 marks (matches MAX MARKS)

Please ensure the math adds up correctly before generating questions.

QUESTIONS:
[EASY]
Q: [Create EXACTLY the number of questions specified in max questions for easy difficulty about ${courseName}]
TYPE: [Choose from: multiple, truefalse, single - mix different types appropriately]
OPTIONS: [For multiple choice: 4 options separated by commas]
ANSWER: [ONLY for single answer questions: Direct answer text]
CORRECT: [For multiple choice: 0-3 based on correct option index] [For true/false: 0 for True, 1 for False] [NOT needed for single answer questions]
EXPLANATION: [Brief explanation of why this is correct]

[MEDIUM]
Q: [Create EXACTLY the number of questions specified in max questions for medium difficulty about ${courseName}]
TYPE: [Choose from: multiple, truefalse, single - mix different types appropriately]
OPTIONS: [For multiple choice: 4 options separated by commas]
ANSWER: [ONLY for single answer questions: Direct answer text]
CORRECT: [For multiple choice: 0-3 based on correct option index] [For true/false: 0 for True, 1 for False] [NOT needed for single answer questions]
EXPLANATION: [Detailed explanation]

[HARD]
Q: [Create EXACTLY the number of questions specified in max questions for hard difficulty about ${courseName}]
TYPE: [Choose from: multiple, truefalse, single - mix different types appropriately]
OPTIONS: [For multiple choice: 4 options separated by commas]
ANSWER: [ONLY for single answer questions: Direct answer text]
CORRECT: [For multiple choice: 0-3 based on correct option index] [For true/false: 0 for True, 1 for False] [NOT needed for single answer questions]
EXPLANATION: [Detailed explanation with examples]

Please ensure:
1. Questions progress from basic concepts to advanced applications
2. Each difficulty level has appropriate number of questions
3. All questions have clear, educational explanations
4. Total marks from all questions should equal the MAX MARKS
5. Time limits are realistic for question complexity
6. Options are plausible and test real understanding

CRITICAL REQUIREMENTS:
- Total questions across all difficulties should be EXACTLY ${QuestionCount}
- Distribution limits (you can choose within these ranges):
  * Easy: Must be between 40-70% of ${QuestionCount} (minimum 40%, maximum 70%)
  * Medium: Must be between 20-50% of ${QuestionCount} (minimum 20%, maximum 50%)
  * Hard: Must be between 5-30% of ${QuestionCount} (minimum 5%, maximum 30%)
- The sum of easy + medium + hard questions must equal exactly ${QuestionCount}
- You have flexibility to choose the exact distribution within these ranges
- Number of questions for each difficulty MUST EXACTLY match your calculated 'max questions' setting
- Mix question types (multiple choice, true/false, single answer) appropriately within each difficulty level
- Easy questions can include: multiple choice, true/false, single answer
- Medium questions can include: multiple choice, true/false, single answer  
- Hard questions can include: multiple choice, true/false, single answer
- Choose question types that best fit the content and difficulty level
- DO NOT create more or fewer questions than the exact number specified in max questions for each difficulty
- For multiple choice questions: Use OPTIONS and CORRECT fields only, do NOT include ANSWER
- For true/false questions: Use CORRECT field only (0=True, 1=False), do NOT include ANSWER  
- For single answer questions: Use ANSWER field only, do NOT include CORRECT
Generate complete .txt file which contains, content for all sections above.`;
  };

  const parseTextFile = (content, availableCategories) => {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    const result = {
      courseData: {},
      difficulties: [],
      difficultySettings: {},
      questions: {},
      errors: [],
    };

    let currentSection = "basic";
    let currentDifficulty = "";
    let currentQuestion = {};
    let inDifficultySettings = false;
    let currentDifficultyForSettings = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle section headers
      if (line.startsWith("[") && line.endsWith("]")) {
        // Save previous question before switching difficulty
        if (
          currentQuestion.question &&
          currentQuestion.explanation &&
          currentDifficulty
        ) {
          if (!result.questions[currentDifficulty]) {
            result.questions[currentDifficulty] = [];
          }
          result.questions[currentDifficulty].push({
            ...currentQuestion,
            id: Date.now() + Math.random(),
            difficulty: currentDifficulty,
            questionImage: null,
            imagePreview: null,
          });
        }

        currentSection = "questions";
        currentDifficulty = line.slice(1, -1).toLowerCase();
        currentQuestion = {}; // Reset current question
        continue;
      }

      if (
        line.toUpperCase() === "DIFFICULTY SETTINGS:" ||
        line.toUpperCase() === "DIFFICULTY_SETTINGS:"
      ) {
        inDifficultySettings = true;
        currentSection = "difficulty_settings";
        continue;
      }

      if (
        line.toUpperCase() === "QUESTIONS:" ||
        line.toUpperCase() === "QUESTIONS: "
      ) {
        inDifficultySettings = false;
        currentSection = "questions";
        continue;
      }

      const normalizeKey = (key) => {
        return key.toLowerCase().replace(/[^a-z]/g, "");
      };
      // Parse basic course info
      if (currentSection === "basic") {
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=").trim();

        if (key && value) {
          const cleanKey = key.trim().toUpperCase();

          // Then in the switch statement:
          const normalizedKey = normalizeKey(cleanKey);
          switch (normalizedKey) {
            case normalizeKey("COURSE_NAME"):
            case normalizeKey("COURSE NAME"):
            case normalizeKey("COURSENAME"):
            case normalizeKey("NAME"):
            case normalizeKey("TITLE"):
              result.courseData.title = value;
              break;
            case normalizeKey("COURSE_DESCRIPTION"):
            case normalizeKey("COURSE DESCRIPTION"):
            case normalizeKey("DESCRIPTION"):
            case normalizeKey("DESC"):
              result.courseData.description = value;
              break;
            case normalizeKey("MAX_MARKS"):
            case normalizeKey("MAX MARKS"):
            case normalizeKey("MAXIMUM MARKS"):
              result.courseData.maxMarks = value;
              break;
            case normalizeKey("CATEGORY"):
            case normalizeKey("COURSE_CATEGORY"):
              // Handle category by finding matching category ID
              if (value && value.trim() !== "") {
                // If categories are available, try to find matching category
                const matchingCategory = availableCategories?.find(
                  (cat) => cat.name.toLowerCase() === value.toLowerCase()
                );
                result.courseData.categoryId = matchingCategory
                  ? matchingCategory.id
                  : value;
              } else {
                result.courseData.categoryId = "";
              }
              break;
            case normalizeKey("DIFFICULTY_LEVELS"):
            case normalizeKey("DIFFICULTY LEVELS"):
              result.difficulties = value
                .split(",")
                .map((d) => d.trim().toLowerCase());
              break;
            case normalizeKey("IS_PAID"):
            case normalizeKey("ISPAID"):
            case normalizeKey("PAID"):
              result.courseData.isPaid = value.toLowerCase() === "true";
              break;
            case normalizeKey("PRICE"):
            case normalizeKey("COURSE_PRICE"):
              result.courseData.price = parseFloat(value) || 0;
              break;
          }
        }
      }

      // Parse difficulty settings
      if (currentSection === "difficulty_settings") {
        if (
          (line.endsWith(":") && !line.includes("=")) ||
          (line.match(/^(easy|medium|hard)$/i) && !line.includes("="))
        ) {
          currentDifficultyForSettings = line
            .replace(":", "")
            .trim()
            .toLowerCase();
          if (!result.difficultySettings[currentDifficultyForSettings]) {
            result.difficultySettings[currentDifficultyForSettings] = {};
          }
        } else if (line.includes("=") && currentDifficultyForSettings) {
          const [key, value] = line.split("=").map((s) => s.trim());
          const normalizedKey = normalizeKey(key);

          // Map various key formats to standard keys
          let standardKey;
          if (
            normalizedKey.includes("marks") &&
            normalizedKey.includes("question")
          ) {
            standardKey = "marksPerQuestion"; // Match your state structure
          } else if (
            normalizedKey.includes("max") &&
            normalizedKey.includes("question")
          ) {
            standardKey = "maxQuestions"; // Match your state structure
          } else if (
            normalizedKey.includes("min") &&
            normalizedKey.includes("time")
          ) {
            standardKey = "minTime"; // Match your state structure
          } else if (
            normalizedKey.includes("max") &&
            normalizedKey.includes("time")
          ) {
            standardKey = "maxTime"; // Match your state structure
          }

          if (standardKey && value) {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue > 0) {
              result.difficultySettings[currentDifficultyForSettings][
                standardKey
              ] = numValue;
            }
          }
        }
      }

      // Parse questions
      if (currentSection === "questions" && currentDifficulty) {
        if (line.startsWith("Q:")) {
          // Save previous question BEFORE starting new one
          if (currentQuestion.question && currentQuestion.explanation) {
            if (!result.questions[currentDifficulty]) {
              result.questions[currentDifficulty] = [];
            }
            result.questions[currentDifficulty].push({
              ...currentQuestion,
              id: Date.now() + Math.random(),
              difficulty: currentDifficulty,
              questionImage: null,
              imagePreview: null,
            });
          }
          currentQuestion = { question: line.slice(2).trim() };
        } else if (line.startsWith("TYPE:")) {
          currentQuestion.questionType = line.slice(5).trim().toLowerCase();
        } else if (line.startsWith("OPTIONS:")) {
          currentQuestion.options = line
            .slice(8)
            .trim()
            .split(",")
            .map((opt) => opt.trim());
        } else if (line.startsWith("CORRECT:")) {
          currentQuestion.correctAnswer = parseInt(line.slice(8).trim());
        } else if (line.startsWith("ANSWER:")) {
          currentQuestion.singleAnswer = line.slice(7).trim();
        } else if (line.startsWith("EXPLANATION:")) {
          currentQuestion.explanation = line.slice(12).trim();
        }
      }
    }

    // Save last question
    if (
      currentQuestion.question &&
      currentQuestion.explanation &&
      currentDifficulty
    ) {
      if (!result.questions[currentDifficulty]) {
        result.questions[currentDifficulty] = [];
      }
      result.questions[currentDifficulty].push({
        ...currentQuestion,
        id: Date.now() + Math.random(),
        difficulty: currentDifficulty,
      });
    }

    return result;
  };

  // ✅ Detect platform from URL
  const detectPlatform = (url) => {
    if (!url) return "Unknown";

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");

      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        return "YouTube";
      } else if (domain.includes("vimeo.com")) {
        return "Vimeo";
      } else if (domain.includes("dailymotion.com")) {
        return "Dailymotion";
      } else if (domain.includes("wistia.com")) {
        return "Wistia";
      }
      return "Other";
    } catch {
      return "Invalid URL";
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      setFileUploadError("Please upload a .txt file");
      return;
    }
    if (!courseData.thumbnail && !imagePreview) {
      setFileUploadError(
        "Please upload a course image first before uploading the text file"
      );
      showToast(
        "Please upload a course image first before uploading the text file"
      );
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setFileUploadError("File size must be less than 10MB");
      return;
    }

    setIsProcessingFile(true);
    setFileUploadError("");

    try {
      const content = await file.text();
      const parsed = parseTextFile(content, contextCategories);

      // Validate parsed data
      if (!parsed.courseData.title) {
        setFileUploadError("Missing COURSE_NAME in the file");
        setCurrentStep(1);
        setErrors({ title: "Course name is required" });
        return;
      } else if (!parsed.courseData.description) {
        setFileUploadError("Missing COURSE_DESCRIPTION in the file");
        setCurrentStep(1);
        setErrors({ description: "Course description is required" });
        return;
      } else if (!parsed.courseData.maxMarks) {
        setFileUploadError("Missing MAX_MARKS in the file");
        setCurrentStep(1);
        setErrors({ maxMarks: "Maximum marks is required" });
        return;
      }

      if (parsed.difficulties.length === 0) {
        setFileUploadError(
          "No difficulty levels found. Please specify DIFFICULTY_LEVELS"
        );
        setShowFormatModal(true);
        return;
      }

      // Apply parsed data
      setCourseData((prev) => ({
        ...prev,
        title: parsed.courseData.title,
        description: parsed.courseData.description,
        maxMarks: parsed.courseData.maxMarks,
        categoryId: parsed.courseData.categoryId || prev.categoryId,
        thumbnail: prev.thumbnail || "",
        isPaid: parsed.courseData.isPaid || false,
        price: parsed.courseData.price || 0,
      }));

      setSelectedDifficulties(parsed.difficulties);

      // Convert difficulty settings format
      const convertedSettings = {};
      Object.entries(parsed.difficultySettings).forEach(([diff, settings]) => {
        convertedSettings[diff] = {
          marksPerQuestion: parseInt(settings.marksPerQuestion) || 1,
          maxQuestions: parseInt(settings.maxQuestions) || 1,
          minTime: parseInt(settings.minTime) || 1,
          maxTime: parseInt(settings.maxTime) || 60,
        };
      });
      // console.log("Parsed difficulty settings:", parsed.difficultySettings);
      // console.log("Converted Settings:", convertedSettings);
      setDifficultySettings(convertedSettings);

      // Add validation before jumping to step 5
      if (Object.keys(convertedSettings).length === 0) {
        setFileUploadError("No difficulty settings found in the file");
        setShowFormatModal(true);
        return;
      }

      // Convert questions format
      const convertedQuestions = {};
      Object.entries(parsed.questions).forEach(([diff, questions]) => {
        convertedQuestions[diff] = questions.map((q) => ({
          ...q,
          hasOptions:
            q.questionType === "multiple" || q.questionType === "truefalse",
          options:
            q.questionType === "truefalse"
              ? ["True", "False"]
              : q.options || [],
          maxOptions: q.options ? q.options.length : 4,
        }));
      });
      setCourseQuestions(convertedQuestions);

      showToast("File uploaded and parsed successfully!");
      const navigateToAppropriateStep = () => {
        // Check each step for validation errors
        const tempErrors = {};

        // Step 1 validation
        if (!parsed.courseData.title?.trim()) {
          tempErrors.step1 = "Course title is required";
        }
        if (!parsed.courseData.description?.trim()) {
          tempErrors.step1 = "Course description is required";
        }
        if (
          !parsed.courseData.maxMarks ||
          parseInt(parsed.courseData.maxMarks) <= 0
        ) {
          tempErrors.step1 = "Valid maximum marks is required";
        }

        // Step 2 validation
        if (parsed.difficulties.length === 0) {
          tempErrors.step2 = "At least one difficulty level is required";
        }

        // Step 3 validation
        let step3HasErrors = false;
        const maxMarks = parseInt(parsed.courseData.maxMarks);
        let totalMarks = 0;

        parsed.difficulties.forEach((difficulty) => {
          const settings = parsed.difficultySettings[difficulty];
          if (
            !settings ||
            !settings.marksPerQuestion ||
            !settings.maxQuestions ||
            !settings.minTime ||
            !settings.maxTime
          ) {
            tempErrors.step3 = `Incomplete settings for ${difficulty} difficulty`;
            step3HasErrors = true;
          } else {
            totalMarks += settings.marksPerQuestion * settings.maxQuestions;
          }
        });

        if (!step3HasErrors && totalMarks !== maxMarks) {
          tempErrors.step3 = `Total marks (${totalMarks}) must equal course max marks (${maxMarks})`;
          step3HasErrors = true;
        }

        // Step 4 validation
        let step4HasErrors = false;
        parsed.difficulties.forEach((difficulty) => {
          const questions = parsed.questions[difficulty] || [];
          const requiredQuestions =
            parsed.difficultySettings[difficulty]?.maxQuestions || 0;
          if (questions.length < requiredQuestions) {
            tempErrors.step4 = `Insufficient questions for ${difficulty} difficulty`;
            step4HasErrors = true;
          }
        });

        // Navigate to appropriate step
        if (tempErrors.step1) {
          setCurrentStep(1);
          setErrors({ title: tempErrors.step1 });
          showToast("Please fix course basic information");
        } else if (tempErrors.step2) {
          setCurrentStep(2);
          setErrors({ difficulties: tempErrors.step2 });
          showToast("Please fix difficulty level selection");
        } else if (tempErrors.step3) {
          setCurrentStep(3);
          setErrors({ marksTotal: tempErrors.step3 });
          showToast("Please fix marks and duration settings");
        } else if (tempErrors.step4) {
          setCurrentStep(4);
          setErrors({ questions: tempErrors.step4 });
          showToast("Please add missing questions");
        } else {
          // All validations passed, go to preview
          // Smart step navigation - go to the first step with errors or to preview if all valid
          const navigateToAppropriateStep = () => {
            // Check each step for validation errors
            const tempErrors = {};

            // Step 1 validation
            if (!parsed.courseData.title?.trim()) {
              tempErrors.step1 = "Course title is required";
            }
            if (!parsed.courseData.description?.trim()) {
              tempErrors.step1 = "Course description is required";
            }
            if (
              !parsed.courseData.maxMarks ||
              parseInt(parsed.courseData.maxMarks) <= 0
            ) {
              tempErrors.step1 = "Valid maximum marks is required";
            }

            // Step 2 validation
            if (parsed.difficulties.length === 0) {
              tempErrors.step2 = "At least one difficulty level is required";
            }

            // Step 3 validation
            let step3HasErrors = false;
            const maxMarks = parseInt(parsed.courseData.maxMarks);
            let totalMarks = 0;

            parsed.difficulties.forEach((difficulty) => {
              const settings = parsed.difficultySettings[difficulty];
              if (
                !settings ||
                !settings.marksPerQuestion ||
                !settings.maxQuestions ||
                !settings.minTime ||
                !settings.maxTime
              ) {
                tempErrors.step3 = `Incomplete settings for ${difficulty} difficulty`;
                step3HasErrors = true;
              } else {
                totalMarks += settings.marksPerQuestion * settings.maxQuestions;
              }
            });

            if (!step3HasErrors && totalMarks !== maxMarks) {
              tempErrors.step3 = `Total marks (${totalMarks}) must equal course max marks (${maxMarks})`;
              step3HasErrors = true;
            }

            // Step 4 validation
            let step4HasErrors = false;
            parsed.difficulties.forEach((difficulty) => {
              const questions = parsed.questions[difficulty] || [];
              const requiredQuestions =
                parsed.difficultySettings[difficulty]?.maxQuestions || 0;
              if (questions.length < requiredQuestions) {
                tempErrors.step4 = `Insufficient questions for ${difficulty} difficulty`;
                step4HasErrors = true;
              }
            });

            // Navigate to appropriate step
            if (tempErrors.step1) {
              setCurrentStep(1);
              setErrors({ title: tempErrors.step1 });
              showToast("Please fix course basic information");
            } else if (tempErrors.step2) {
              setCurrentStep(2);
              setErrors({ difficulties: tempErrors.step2 });
              showToast("Please fix difficulty level selection");
            } else if (tempErrors.step3) {
              setCurrentStep(3);
              setErrors({ marksTotal: tempErrors.step3 });
              showToast("Please fix marks and duration settings");
            } else if (tempErrors.step4) {
              setCurrentStep(4);
              setErrors({ questions: tempErrors.step4 });
              showToast("Please add missing questions");
            } else {
              // All validations passed, go to preview
              setCurrentStep(5);
              setErrors({});
              showToast("File parsed successfully! Review your course.");
            }
          };

          // Call the navigation function
          navigateToAppropriateStep();
          setErrors({});
          showToast("File parsed successfully! Review your course.");
        }
      };
      // console.log("Parsed difficulty settings:", parsed.difficultySettings);
      // Call the navigation function
      navigateToAppropriateStep();
    } catch (error) {
      setFileUploadError("Error reading file: " + error.message);
      setShowFormatModal(true);
    } finally {
      setIsProcessingFile(false);
      event.target.value = ""; // Reset input
    }
    // console.log("Applied courseData:", courseData);
    // console.log("Applied selectedDifficulties:", selectedDifficulties);
    // console.log("Applied difficultySettings:", difficultySettings);
  };

  // Difficulty Levels
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [difficultySettings, setDifficultySettings] = useState({});

  // Questions
  const [currentDifficultyForQuestions, setCurrentDifficultyForQuestions] =
    useState("");
  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    categoryId: "",
    maxMarks: "",
    thumbnail: "",
    status: "draft",
    isPaid: false,
    price: 0,
    currency: "INR",
  });
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", ""],
    correctAnswer: 0,
    hasOptions: true,
    explanation: "",
    questionType: "multiple", // "multiple", "single", "truefalse"
    singleAnswer: "",
    maxOptions: 2, // customizable max options
    hasImage: false,
    questionImage: null,
    imagePreview: null,
  });
  const [courseQuestions, setCourseQuestions] = useState({});
  const [previewQuestion, setPreviewQuestion] = useState(null);

  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});

  const difficultyOptions = [
    { value: "easy", label: "Easy", color: "bg-green-100 text-green-800" },
    {
      value: "medium",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-800",
    },
    { value: "hard", label: "Hard", color: "bg-red-100 text-red-800" },
  ];

  const questionTypes = [
    { value: "multiple", label: "Multiple Choice", icon: "" },
    { value: "single", label: "Single Answer", icon: "" },
    { value: "truefalse", label: "True/False", icon: "" },
  ];

  const steps = [
    { id: 1, title: "Basic Info", description: "Course details and image" },
    {
      id: 2,
      title: "Difficulty Levels",
      description: "Select difficulty levels",
    },
    {
      id: 3,
      title: "Marks & Duration",
      description: "Set marks and time limits",
    },
    {
      id: 4,
      title: "Add Questions",
      description: "Create questions for each level",
    },
    {
      id: 5,
      title: "Video Content",
      description: "Add videos or links (Optional)",
    }, // NEW STEP
    { id: 6, title: "Preview & Save", description: "Review and save course" },
  ];

  const {
    createCourse,
    loading: contextLoading,
    fetchCategories,
    categories: contextCategories,
  } = useAdmin();

  const showToast = (message) => {
    setToast(message);
  };

  const hideToast = () => {
    setToast(null);
  };

  // Initialize currentDifficultyForQuestions when selectedDifficulties change
  useEffect(() => {
    if (
      currentStep === 4 &&
      selectedDifficulties.length > 0 &&
      !currentDifficultyForQuestions
    ) {
      setCurrentDifficultyForQuestions(selectedDifficulties[0]);
    }
  }, [currentStep, selectedDifficulties, currentDifficultyForQuestions]);

  const fetchCategory = async () => {
    try {
      await fetchCategories(); // This will update the categories in context-
    } catch (error) {
      showToast("Error fetching categories");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setCourseData((prev) => ({ ...prev, thumbnail: file }));
    }
  };

  const handleDifficultyToggle = (difficulty) => {
    setSelectedDifficulties((prev) => {
      const newSelection = prev.includes(difficulty)
        ? prev.filter((d) => d !== difficulty)
        : [...prev, difficulty];

      // Clean up settings for removed difficulties
      if (!newSelection.includes(difficulty)) {
        const newSettings = { ...difficultySettings };
        delete newSettings[difficulty];
        setDifficultySettings(newSettings);
      }

      return newSelection;
    });
  };

  const updateDifficultySetting = (difficulty, field, value) => {
    setDifficultySettings((prev) => {
      const newSettings = {
        ...prev,
        [difficulty]: {
          ...prev[difficulty],
          [field]: value,
        },
      };

      if (field === "marksPerQuestion" || field === "maxQuestions") {
        const setting = newSettings[difficulty];
        // Only calculate if both are valid numbers (not empty strings)
        if (
          setting.marksPerQuestion &&
          setting.maxQuestions &&
          setting.marksPerQuestion !== "" &&
          setting.maxQuestions !== ""
        ) {
          newSettings[difficulty].totalMarks =
            Number(setting.marksPerQuestion) * Number(setting.maxQuestions);
        }
      }

      return newSettings;
    });

    // Clear related errors when user starts typing
    if (errors[difficulty] || errors.marksTotal) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[difficulty];
        delete newErrors.marksTotal;
        return newErrors;
      });
    }
  };

  const calculateTotalMarks = () => {
    return selectedDifficulties.reduce((total, difficulty) => {
      const setting = difficultySettings[difficulty];
      return (
        total +
        (setting
          ? (Number(setting.marksPerQuestion) || 0) *
            (Number(setting.maxQuestions) || 0)
          : 0)
      );
    }, 0);
  };

  // Add this function after your existing handlers
  const handleQuestionImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        setErrors({ questionImage: "Image size must be less than 2MB" });
        return;
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        setErrors({
          questionImage: "Only JPEG, PNG, and GIF images are allowed",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setQuestionForm((prev) => ({
          ...prev,
          questionImage: file,
          imagePreview: e.target.result,
        }));
      };
      reader.readAsDataURL(file);

      // Clear any previous errors
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.questionImage;
        return newErrors;
      });
    }
  };

  const toggleQuestionImage = () => {
    setQuestionForm((prev) => ({
      ...prev,
      hasImage: !prev.hasImage,
      questionImage: null,
      imagePreview: null,
    }));
  };

  const removeQuestionImage = () => {
    setQuestionForm((prev) => ({
      ...prev,
      questionImage: null,
      imagePreview: null,
    }));
  };
  useEffect(() => {
    fetchCategory(); // Call your local function
  }, []);

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!courseData.title.trim()) {
          newErrors.title = "Course title is required";
        } else if (courseData.title.trim().length < 2) {
          newErrors.title = "Course title must be at least 2 characters";
        } else if (courseData.title.trim().length > 100) {
          newErrors.title = "Course title cannot exceed 100 characters";
        }

        if (!courseData.description.trim()) {
          newErrors.description = "Course description is required";
        } else if (courseData.description.trim().length < 5) {
          newErrors.description =
            "Course description must be at least 5 characters";
        } else if (courseData.description.trim().length > 800) {
          newErrors.description =
            "Course description cannot exceed 800 characters";
        }

        if (!courseData.maxMarks || courseData.maxMarks <= 0) {
          newErrors.maxMarks = "Maximum marks must be greater than 0";
        } else if (courseData.maxMarks < 1) {
          newErrors.maxMarks = "Maximum marks must be at least 1";
        } else if (courseData.maxMarks > 100) {
          newErrors.maxMarks = "Maximum marks cannot exceed 100";
        }
        if (courseData.isPaid === null || courseData.isPaid === undefined) {
          newErrors.isPaid = "Please select course type (Free or Paid)";
        }

        if (courseData.isPaid === true) {
          // Check if price is empty string, zero, or invalid
          if (
            courseData.price === "" ||
            courseData.price === null ||
            courseData.price === undefined ||
            courseData.price <= 0
          ) {
            newErrors.price = "Price must be greater than 0 for paid courses";
          } else if (courseData.price > 50000) {
            newErrors.price = "Price cannot exceed ₹50,000";
          }
        }
        // Validate image upload is required
        if (!courseData.thumbnail && !imagePreview) {
          newErrors.thumbnail = "Course thumbnail is required";
        }
        break;

      case 2:
        if (selectedDifficulties.length === 0)
          newErrors.difficulties = "Select at least one difficulty level";
        break;

      case 3:
        const maxMarks = parseInt(courseData.maxMarks);
        let runningTotal = 0;

        selectedDifficulties.forEach((difficulty) => {
          const setting = difficultySettings[difficulty];
          if (
            !setting ||
            !setting.marksPerQuestion ||
            !setting.maxQuestions ||
            !setting.minTime ||
            !setting.maxTime
          ) {
            newErrors[difficulty] = "Complete all fields for " + difficulty;
          } else {
            const difficultyTotal =
              setting.marksPerQuestion * setting.maxQuestions;
            runningTotal += difficultyTotal;

            // Validate marksPerQuestion (1-10)
            if (setting.marksPerQuestion < 1) {
              newErrors[
                difficulty
              ] = `Marks per question must be at least 1 for ${difficulty}`;
            }
            // Validate minTime (at least 10)
            else if (setting.minTime < 1) {
              newErrors[
                difficulty
              ] = `Min time must be at least 1 seconds for ${difficulty}`;
            }
            // Validate maxTime >= minTime
            else if (setting.maxTime <= setting.minTime) {
              newErrors[
                difficulty
              ] = `Max time must be greater than min time for ${difficulty}`;
            }
            // Validate difficulty total doesn't exceed course max
            else if (difficultyTotal > maxMarks) {
              newErrors[
                difficulty
              ] = `Total marks for ${difficulty} (${difficultyTotal}) cannot exceed course maximum marks (${maxMarks})`;
            }
          }
        });

        // Check if total marks match exactly
        if (runningTotal !== maxMarks && Object.keys(newErrors).length === 0) {
          if (runningTotal > maxMarks) {
            newErrors.marksTotal = `Total marks (${runningTotal}) exceeds course maximum marks (${maxMarks}). Please reduce marks for some difficulties.`;
          } else {
            newErrors.marksTotal = `Total marks (${runningTotal}) is less than course maximum marks (${maxMarks}). Please increase marks to match exactly.`;
          }
        }
        break;

      case 4:
        selectedDifficulties.forEach((difficulty) => {
          const questions = courseQuestions[difficulty] || [];
          const requiredQuestions =
            difficultySettings[difficulty]?.maxQuestions || 0;

          // Check if we have enough questions
          if (questions.length < requiredQuestions) {
            newErrors[difficulty] = `Need ${
              requiredQuestions - questions.length
            } more questions for ${difficulty}`;
          }

          // Validate each question's content
          questions.forEach((question, index) => {
            if (!question.question || question.question.trim().length < 10) {
              newErrors[`${difficulty}_question_${index}`] = `Question ${
                index + 1
              } in ${difficulty} must be at least 10 characters`;
            }

            if (
              !question.explanation ||
              question.explanation.trim().length < 10
            ) {
              newErrors[
                `${difficulty}_explanation_${index}`
              ] = `Explanation for question ${
                index + 1
              } in ${difficulty} must be at least 10 characters`;
            }

            // Validate based on question type
            if (question.questionType === "multiple") {
              if (
                !question.options ||
                question.options.some((opt) => !opt.trim())
              ) {
                newErrors[
                  `${difficulty}_options_${index}`
                ] = `All options for question ${
                  index + 1
                } in ${difficulty} must be filled`;
              }
            } else if (question.questionType === "single") {
              if (
                !question.singleAnswer ||
                question.singleAnswer.trim().length === 0
              ) {
                newErrors[
                  `${difficulty}_answer_${index}`
                ] = `Answer for question ${
                  index + 1
                } in ${difficulty} is required`;
              }
            }
          });
        });
        break;

      case 5:
        // Video content validation (COMPLETELY OPTIONAL for paid courses)
        if (courseData.isPaid && videoType !== "none") {
          if (videoType === "course") {
            // Only validate if user entered ANY link
            const hasAnyLink = courseVideoLinks.some((link) => link.url.trim());

            if (hasAnyLink) {
              // Validate URLs only if they exist
              courseVideoLinks.forEach((link, index) => {
                if (link.url.trim()) {
                  try {
                    new URL(link.url);
                  } catch {
                    newErrors[`videoLink${index}`] = "Invalid video URL";
                  }
                }
              });
            }
            // No error if no links provided - videos are optional
          } else if (videoType === "difficulty") {
            // Validate difficulty-level video links only if provided
            const difficulties =
              selectedDifficulties ||
              courseData.difficulties?.map((d) => d.name) ||
              [];

            difficulties.forEach((diff) => {
              const links = difficultyVideoLinks[diff] || [];
              const hasAnyLink = links.some((link) => link.url.trim());

              if (hasAnyLink) {
                // Validate URLs only if they exist
                links.forEach((link, index) => {
                  if (link.url.trim()) {
                    try {
                      new URL(link.url);
                    } catch {
                      newErrors[
                        `${diff}VideoLink${index}`
                      ] = `Invalid video URL for ${diff}`;
                    }
                  }
                });
              }
              // No error if no links provided - videos are optional
            });
          }
        }
        // If course is free OR videoType is "none", step 5 passes automatically
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Initialize first difficulty for questions when entering step 4
        const firstDifficulty = selectedDifficulties[0];
        setCurrentDifficultyForQuestions(firstDifficulty);
      }

      // Skip Step 5 (Video Content) if course is free
      if (currentStep === 4 && !courseData.isPaid) {
        setCurrentStep(6); // Jump directly to Preview & Save
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, 6));
      }
    } else {
      // Show specific error messages
      const errorMessages = Object.entries(errors).map(([field, message]) => {
        if (field === "marksTotal") return message;
        return `${field}: ${message}`;
      });
      showToast(
        `Please address these errors or missing Field: ${errorMessages.join(
          ", "
        )}`
      );
    }
  };

  const prevStep = () => {
    if (currentStep === 4) {
      // Clear current difficulty when leaving step 4
      setCurrentDifficultyForQuestions("");
    }

    // Skip Step 5 (Video Content) when going back from Step 6 if course is free
    if (currentStep === 6 && !courseData.isPaid) {
      setCurrentStep(4); // Jump back to Step 4 (Questions)
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleAddOption = () => {
    if (questionForm.options.length < 6) {
      setQuestionForm((prev) => ({
        ...prev,
        options: [...prev.options, ""],
      }));
    }
  };

  const handleRemoveOption = (index) => {
    if (questionForm.options.length > 2) {
      const newOptions = questionForm.options.filter((_, i) => i !== index);
      setQuestionForm((prev) => ({
        ...prev,
        options: newOptions,
        correctAnswer:
          prev.correctAnswer >= newOptions.length ? 0 : prev.correctAnswer,
      }));
    }
  };

  const handleMaxOptionsChange = (max) => {
    const newMax = Math.min(Math.max(2, max), 8); // Between 2-8 options
    setQuestionForm((prev) => {
      const newOptions = [...prev.options];
      if (newOptions.length > newMax) {
        newOptions.splice(newMax);
      } else {
        while (newOptions.length < newMax) {
          newOptions.push("");
        }
      }
      return {
        ...prev,
        maxOptions: newMax,
        options: newOptions,
        correctAnswer: prev.correctAnswer >= newMax ? 0 : prev.correctAnswer,
      };
    });
  };

  const shuffleOptions = () => {
    const indices = questionForm.options.map((_, i) => i);
    const correctOption = questionForm.options[questionForm.correctAnswer];

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const shuffledOptions = indices.map((i) => questionForm.options[i]);
    const newCorrectIndex = shuffledOptions.indexOf(correctOption);

    setQuestionForm((prev) => ({
      ...prev,
      options: shuffledOptions,
      correctAnswer: newCorrectIndex,
    }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm((prev) => ({ ...prev, options: newOptions }));
  };

  const handleQuestionTypeChange = (type) => {
    setQuestionForm((prev) => ({
      ...prev,
      questionType: type,
      hasOptions: type === "multiple" || type === "truefalse",
      options:
        type === "truefalse"
          ? ["True", "False"]
          : type === "multiple"
          ? ["", ""]
          : [],
      correctAnswer: 0,
      singleAnswer: "",
    }));
  };
  const addQuestion = () => {
    // Validate question text
    if (!questionForm.question.trim()) {
      setErrors({ question: "Question text is required" });
      return;
    } else if (questionForm.question.trim().length < 10) {
      setErrors({ question: "Question must be at least 10 characters" });
      return;
    } else if (questionForm.question.trim().length > 1000) {
      setErrors({ question: "Question cannot exceed 1000 characters" });
      return;
    }

    // Validate explanation (required in model)
    if (!questionForm.explanation.trim()) {
      setErrors({ explanation: "Explanation is required" });
      return;
    } else if (questionForm.explanation.trim().length < 10) {
      setErrors({ explanation: "Explanation must be at least 10 characters" });
      return;
    }

    // Validation for different question types
    if (questionForm.questionType === "multiple") {
      if (questionForm.options.some((opt) => !opt.trim())) {
        setErrors({ options: "All options must be filled" });
        return;
      }
    } else if (questionForm.questionType === "single") {
      if (!questionForm.singleAnswer.trim()) {
        setErrors({ singleAnswer: "Answer is required" });
        return;
      } else if (questionForm.singleAnswer.trim().length > 2500) {
        setErrors({ singleAnswer: "Answer cannot exceed 2500 characters" });
        return;
      }
    }

    const newQuestion = {
      id: Date.now(),
      question: questionForm.question,
      questionType: questionForm.questionType,
      options:
        questionForm.questionType === "multiple"
          ? questionForm.options.filter((opt) => opt.trim())
          : questionForm.questionType === "truefalse"
          ? ["True", "False"]
          : [],
      numberOfOptions:
        questionForm.questionType === "multiple"
          ? questionForm.options.filter((opt) => opt.trim()).length
          : questionForm.questionType === "truefalse"
          ? 2
          : 0,
      correctAnswer:
        questionForm.questionType === "multiple"
          ? questionForm.correctAnswer
          : questionForm.questionType === "truefalse"
          ? questionForm.correctAnswer
          : null,
      singleAnswer:
        questionForm.questionType === "single" ? questionForm.singleAnswer : "",
      explanation: questionForm.explanation,
      difficulty: currentDifficultyForQuestions,
      marks:
        difficultySettings[currentDifficultyForQuestions]?.marksPerQuestion ||
        1,
      timeLimit:
        difficultySettings[currentDifficultyForQuestions]?.timeLimit || 30,
      maxOptions: questionForm.maxOptions,
      questionImage: questionForm.questionImage,
      imagePreview: questionForm.imagePreview,
    };

    setCourseQuestions((prev) => ({
      ...prev,
      [currentDifficultyForQuestions]: [
        ...(prev[currentDifficultyForQuestions] || []),
        newQuestion,
      ],
    }));

    // Reset form
    setQuestionForm({
      question: "",
      options: ["", ""],
      correctAnswer: 0,
      hasOptions: true,
      explanation: "",
      questionType: "multiple",
      singleAnswer: "",
      maxOptions: 2,
      // ADD THESE RESET VALUES
      hasImage: false,
      questionImage: null,
      imagePreview: null,
    });
    setErrors({});
  };

  const removeQuestion = (difficulty, questionId) => {
    setCourseQuestions((prev) => ({
      ...prev,
      [difficulty]: (prev[difficulty] || []).filter((q) => q.id !== questionId),
    }));
  };

  const handleExitAttempt = () => {
    if (currentStep > 1 || courseData.title || courseData.description) {
      setShowExitModal(true);
    } else {
      resetForm();
    }
  };
  const handleGeneratePrompt = useCallback(() => {
    if (aiPromptCourseName.trim()) {
      setGeneratedPrompt(generateAIPrompt(aiPromptCourseName));
    }
  }, [aiPromptCourseName]);
  const resetForm = () => {
    setCourseData({
      title: "",
      description: "",
      categoryId: "",
      maxMarks: "",
      thumbnail: "",
      status: "draft",
      isPaid: false,
      price: 0,
    });
    setSelectedDifficulties([]);
    setDifficultySettings({});
    setCourseQuestions({});
    setCurrentStep(1);
    setImagePreview("");
    setErrors({});
    setShowExitModal(false);
  };

  const handleSaveCourse = async () => {
    try {
      setLoading(true);

      // First, prepare questions in the correct format
      const allQuestions = [];
      Object.entries(courseQuestions).forEach(([difficulty, questionList]) => {
        if (questionList && questionList.length > 0) {
          const formattedQuestions = questionList.map((q) => ({
            difficulty:
              difficulty.charAt(0).toUpperCase() +
              difficulty.slice(1).toLowerCase(),
            question: q.question,
            questionType: q.questionType,
            numberOfOptions: q.numberOfOptions || 0,
            options:
              q.questionType === "multiple"
                ? q.options.filter((opt) => opt.trim())
                : q.questionType === "truefalse"
                ? ["True", "False"]
                : [],
            correctAnswer:
              q.questionType === "multiple"
                ? q.correctAnswer
                : q.questionType === "truefalse"
                ? q.correctAnswer
                : q.singleAnswer,
            explanation: q.explanation,
            image: q.questionImage || null,
          }));
          allQuestions.push(...formattedQuestions);
        }
      });

      const totalQuestions = Object.values(courseQuestions).reduce(
        (total, questionList) => {
          return total + (questionList ? questionList.length : 0);
        },
        0
      );

      const apiCourseData = {
        name: courseData.title,
        description: courseData.description,
        category:
          courseData.categoryId && courseData.categoryId.trim() !== ""
            ? courseData.categoryId
            : null,
        difficulties: selectedDifficulties.map((diff) => {
          const settings = difficultySettings[diff];
          return {
            name: diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase(),
            marksPerQuestion: parseInt(settings?.marksPerQuestion) || 1,
            maxQuestions: parseInt(settings?.maxQuestions) || 1,
            totalMarks:
              (parseInt(settings?.marksPerQuestion) || 1) *
              (parseInt(settings?.maxQuestions) || 1),
            timerSettings: {
              minTime: parseInt(settings?.minTime) || 30,
              maxTime: parseInt(settings?.maxTime) || 60,
            },
          };
        }),
        maxQuestionsPerTest: totalQuestions,
        isPaid: Boolean(courseData.isPaid),
        image:
          courseData.thumbnail instanceof File ? courseData.thumbnail : null,
      };

      if (courseData.isPaid) {
        apiCourseData.price =
          courseData.price === "" ? 0 : parseFloat(courseData.price) || 0;

        // Add video content to API data
        if (videoType !== "none") {
          const videoContentData = {
            type: videoType,
            courseVideo: { links: [] },
            difficultyVideos: [],
          };

          if (videoType === "course") {
            // Filter out empty links
            const validLinks = courseVideoLinks.filter(
              (link) => link.url && link.url.trim()
            );
            videoContentData.courseVideo.links = validLinks;
          } else if (videoType === "difficulty") {
            // Process difficulty videos
            selectedDifficulties.forEach((diff) => {
              // Use lowercase to access state (diff is already lowercase like "easy")
              const links = difficultyVideoLinks[diff] || [];

              const validLinks = links.filter(
                (link) => link.url && link.url.trim()
              );

              if (validLinks.length > 0) {
                // Capitalize only when sending to backend
                const capitalizedDiff =
                  diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();

                videoContentData.difficultyVideos.push({
                  difficulty: capitalizedDiff,
                  links: validLinks,
                });
              }
            });
          }

          apiCourseData.videoContent = videoContentData;
        }
      }

      // Call your actual API through context with questions
      const result = await createCourseWithQuestions(
        apiCourseData,
        courseQuestions
      );

      if (result.success) {
        showToast("Course created successfully!");
        resetForm();
      } else {
        showToast(result.message || "Failed to save course");
        setErrors({ submit: result.message || "Failed to save course" });
      }
    } catch (error) {
      console.error("Course creation error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = getDetailedErrorMessage(error);
      showToast(`Failed to save course: ${errorMessage}`);
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getDetailedErrorMessage = (error) => {
    if (
      error.response?.data?.errors &&
      Array.isArray(error.response.data.errors)
    ) {
      return error.response.data.errors
        .map((err) => err.msg || err.message)
        .join(", ");
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    return error.message || "An unexpected error occurred";
  };
  const FormatModal = () => (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
              Expected File Format
            </h2>
            <button
              onClick={() => setShowFormatModal(false)}
              className="self-end sm:self-auto text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {fileUploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 shadow-sm">
              <p className="text-red-700 font-semibold mb-1">Error:</p>
              <p className="text-red-600">{fileUploadError}</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 shadow-inner">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto font-mono leading-relaxed">
              {EXPECTED_FILE_FORMAT}
            </pre>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowFormatModal(false)}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* File Upload Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-blue-900">
                  Quick Setup Options
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAIPromptModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm underline cursor-pointer"
                  >
                    Generate AI Prompt
                  </button>
                  <button
                    onClick={() => setShowFormatModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm underline cursor-pointer"
                  >
                    View Format Guide
                  </button>
                </div>
              </div>
              <p className="text-blue-700 text-sm mb-4">
                Upload a .txt file with your course data to skip manual entry
                (Max 10MB)
                <br />
                <span className="text-blue-600 font-medium">
                  Field names are flexible - use any case, spaces, or
                  underscores
                </span>
              </p>

              <div className="flex items-center gap-4">
                <label
                  className={`px-4 py-2 rounded-md transition-colors ${
                    (!courseData.thumbnail && !imagePreview) || isProcessingFile
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isProcessingFile ? "Processing..." : "Upload .txt File"}
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={
                      isProcessingFile ||
                      (!courseData.thumbnail && !imagePreview)
                    }
                  />
                </label>

                {fileUploadError && (
                  <p className="text-red-600 text-sm">{fileUploadError}</p>
                )}

                {!courseData.thumbnail && !imagePreview && (
                  <p className="text-gray-500 text-sm">
                    📋 Upload course image first to enable text file upload
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or fill manually
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={courseData.title}
                    onChange={(e) =>
                      setCourseData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.title ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                    style={{
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#111827",
                    }}
                    placeholder="Enter course title"
                    autoComplete="off"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Description *
                  </label>
                  <textarea
                    value={courseData.description}
                    onChange={(e) =>
                      setCourseData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className={`w-full px-3 py-2 border ${
                      errors.description ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-gray-900 placeholder-gray-400`}
                    placeholder="Enter course description"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Marks *
                  </label>
                  <input
                    type="number"
                    value={courseData.maxMarks}
                    onChange={(e) =>
                      setCourseData((prev) => ({
                        ...prev,
                        maxMarks: e.target.value,
                      }))
                    }
                    min="1"
                    className={`w-full px-3 py-2 border ${
                      errors.maxMarks ? "border-red-300" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                    placeholder="Enter maximum marks"
                    style={{
                      WebkitBoxShadow: "0 0 0 1000px white inset",
                      WebkitTextFillColor: "#111827",
                    }}
                  />
                  {errors.maxMarks && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.maxMarks}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Course Type *
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="courseType"
                          value="false"
                          checked={courseData.isPaid === false}
                          onChange={(e) =>
                            setCourseData((prev) => ({
                              ...prev,
                              isPaid: e.target.value === "true", // Convert string to boolean
                              price:
                                e.target.value === "true"
                                  ? prev.price || 100
                                  : 0,
                            }))
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">
                          Free Course
                        </span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="courseType"
                          value="true"
                          checked={courseData.isPaid === true}
                          onChange={(e) =>
                            setCourseData((prev) => ({
                              ...prev,
                              isPaid: e.target.value === "true", // Convert string to boolean
                              price:
                                e.target.value === "true"
                                  ? prev.price || 100
                                  : 0,
                            }))
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">
                          Paid Course
                        </span>
                      </label>
                    </div>

                    {courseData.isPaid && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Price (INR) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={courseData.price}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty string for backspace, otherwise parse to float
                              setCourseData((prev) => ({
                                ...prev,
                                price:
                                  value === "" ? "" : parseFloat(value) || "",
                              }));
                            }}
                            min="1"
                            step="0.01"
                            className={`w-full pl-8 pr-3 py-2 border ${
                              errors.price
                                ? "border-red-300"
                                : "border-gray-300"
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Enter course price"
                          />
                        </div>
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.price}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.isPaid && (
                    <p className="mt-1 text-sm text-red-600">{errors.isPaid}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={courseData.categoryId}
                    onChange={(e) =>
                      setCourseData((prev) => ({
                        ...prev,
                        categoryId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category (Optional)</option>
                    {(contextCategories || []).map((category, index) => (
                      <option
                        key={category.id || `category-${index}`}
                        value={category._id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Thumbnail
                </label>
                <div className="space-y-3">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Course thumbnail"
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview("");
                          setCourseData((prev) => ({ ...prev, thumbnail: "" }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed ${
                        errors.thumbnail ? "border-red-300" : "border-gray-300"
                      } rounded-md p-8 text-center`}
                    >
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label className="cursor-pointer group">
                          <span className="text-sm text-blue-600 hover:text-blue-500 group-hover:underline transition-all duration-200">
                            Upload course image
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                {errors.thumbnail && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.thumbnail}
                  </p>
                )}
                {errors.title && (
                  <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Select Difficulty Levels
              </h3>
              <p className="text-gray-600">
                Choose which difficulty levels your course will have
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {difficultyOptions.map((difficulty) => (
                <div
                  key={difficulty.value}
                  className={`border-2 rounded-lg p-4 sm:p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-md ${
                    selectedDifficulties.includes(difficulty.value)
                      ? "border-blue-500 bg-blue-50 shadow-md scale-105"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                  onClick={() => handleDifficultyToggle(difficulty.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                        {difficulty.label}
                      </h4>
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${difficulty.color}`}
                      >
                        {difficulty.label}
                      </span>
                    </div>
                    {selectedDifficulties.includes(difficulty.value) && (
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.difficulties && (
              <p className="mt-2 text-sm text-red-600">{errors.difficulties}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Configure Marks & Duration
              </h3>
              <p className="text-gray-600">
                Set marks per question and time limits for each difficulty
              </p>
            </div>

            <div className="space-y-6">
              {selectedDifficulties.map((difficulty) => (
                <div key={difficulty} className="border rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        difficultyOptions.find((d) => d.value === difficulty)
                          ?.color
                      }`}
                    >
                      {
                        difficultyOptions.find((d) => d.value === difficulty)
                          ?.label
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Questions *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={
                          difficultySettings[difficulty]?.maxQuestions ?? ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for backspace, otherwise parse to number
                          updateDifficultySetting(
                            difficulty,
                            "maxQuestions",
                            value === "" ? "" : parseInt(value) || ""
                          );
                        }}
                        className={`w-full px-3 py-2 border ${
                          errors[difficulty]
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                        placeholder="e.g., 10"
                        style={{
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "#111827",
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marks per Question *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={
                          difficultySettings[difficulty]?.marksPerQuestion || ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for backspace, otherwise parse to number
                          updateDifficultySetting(
                            difficulty,
                            "marksPerQuestion",
                            value === "" ? "" : parseInt(value) || ""
                          );
                        }}
                        className={`w-full px-3 py-2 border ${
                          errors[difficulty]
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                        placeholder="e.g., 2"
                        style={{
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "#111827",
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Time per Question (seconds) *
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={difficultySettings[difficulty]?.minTime || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for backspace, otherwise parse to number
                          updateDifficultySetting(
                            difficulty,
                            "minTime",
                            value === "" ? "" : parseInt(value) || ""
                          );
                        }}
                        className={`w-full px-3 py-2 border ${
                          errors[difficulty]
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                        placeholder="e.g., 30"
                        style={{
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "#111827",
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Time per Question (seconds) *
                      </label>
                      <input
                        type="number"
                        min="11"
                        value={difficultySettings[difficulty]?.maxTime || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for backspace, otherwise parse to number
                          updateDifficultySetting(
                            difficulty,
                            "maxTime",
                            value === "" ? "" : parseInt(value) || ""
                            // parseInt(e.target.value)
                          );
                        }}
                        className={`w-full px-3 py-2 border ${
                          errors[difficulty]
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400 autofill:bg-white autofill:text-gray-900`}
                        placeholder="e.g., 60"
                        style={{
                          WebkitBoxShadow: "0 0 0 1000px white inset",
                          WebkitTextFillColor: "#111827",
                        }}
                      />
                    </div>
                  </div>
                  {(difficultySettings[difficulty]?.minTime ||
                    difficultySettings[difficulty]?.maxTime) && (
                    <div className="mt-2 text-sm text-gray-600">
                      ⏱Time Range:{" "}
                      {difficultySettings[difficulty]?.minTime || 0}s -{" "}
                      {difficultySettings[difficulty]?.maxTime || 0}s per
                      question
                    </div>
                  )}

                  {errors[difficulty] && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors[difficulty]}
                    </p>
                  )}
                </div>
              ))}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">
                    Total Course Marks:
                  </span>
                  <span className="text-lg font-bold text-blue-900">
                    {calculateTotalMarks()} / {courseData.maxMarks}
                  </span>
                </div>
                {errors.marksTotal && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.marksTotal}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Add Questions
                </h3>
                <p className="text-gray-600">
                  Create questions for each difficulty level
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Difficulty:
                </label>
                <select
                  value={currentDifficultyForQuestions}
                  onChange={(e) =>
                    setCurrentDifficultyForQuestions(e.target.value)
                  }
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {selectedDifficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {
                        difficultyOptions.find((d) => d.value === difficulty)
                          ?.label
                      }
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentDifficultyForQuestions && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Question Form */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 text-lg">
                        Create New Question
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          Question #
                          {(
                            courseQuestions[currentDifficultyForQuestions] || []
                          ).length + 1}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Question Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Question Type *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {questionTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                handleQuestionTypeChange(type.value)
                              }
                              className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium cursor-pointer ${
                                questionForm.questionType === type.value
                                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-lg mb-1">{type.icon}</div>
                                <div>{type.label}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Question Text *
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setShowQuestionPreview(!showQuestionPreview)
                            }
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>
                              {showQuestionPreview ? "Hide" : "Show"} Preview
                            </span>
                          </button>
                        </div>

                        <textarea
                          value={questionForm.question}
                          onChange={(e) =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              question: e.target.value,
                            }))
                          }
                          rows={6}
                          className={`w-full px-4 py-3 border-2 ${
                            errors.question
                              ? "border-red-300"
                              : "border-gray-200"
                          } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 resize-none font-mono text-sm`}
                          placeholder={`Enter your question here...

                          Formatting tips:
                          - Use \`code\` for inline code
                          - Use \`\`\`python for code blocks
                          - Use $x^2$ for inline math
                          - Use $$\\frac{a}{b}$$ for block math

                          Example:
                          What is the output of \`print(4 + 3 % 5)\` in Python?`}
                        />

                        {/* Formatting Help */}
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs space-y-1">
                            <p className="font-semibold text-blue-900">
                              Formatting Guide:
                            </p>
                            <ul className="text-blue-800 space-y-0.5 ml-4">
                              <li>
                                •{" "}
                                <code className="bg-white px-1 rounded">
                                  `code`
                                </code>{" "}
                                = Inline code
                              </li>
                              <li>
                                •{" "}
                                <code className="bg-white px-1 rounded">
                                  ```python ... ```
                                </code>{" "}
                                = Code block
                              </li>
                              <li>
                                •{" "}
                                <code className="bg-white px-1 rounded">
                                  $x^2$
                                </code>{" "}
                                = Inline math
                              </li>
                              <li>
                                •{" "}
                                <code className="bg-white px-1 rounded">
                                  {"$$ frac{a}{b}$$"}
                                </code>{" "}
                                = Block math
                              </li>
                            </ul>
                          </div>
                        </div>

                        {/* Live Preview */}
                        {showQuestionPreview && questionForm.question && (
                          <div className="mt-3 border border-gray-300 rounded-lg p-4 bg-gray-50">
                            <p className="text-xs text-gray-600 mb-2 font-semibold">
                              Preview:
                            </p>
                            <RichTextRenderer content={questionForm.question} />
                          </div>
                        )}

                        <div className="flex justify-between text-xs mt-1">
                          <span
                            className={`${
                              questionForm.question.length < 10 &&
                              questionForm.question.length > 0
                                ? "text-red-500"
                                : "text-gray-500"
                            }`}
                          >
                            {questionForm.question.length < 10
                              ? `Minimum 10 characters (${
                                  10 - questionForm.question.length
                                } more needed)`
                              : "Minimum requirement met"}
                          </span>
                          <span
                            className={`${
                              questionForm.question.length > 1000
                                ? "text-red-500"
                                : "text-gray-500"
                            }`}
                          >
                            {questionForm.question.length}/1000
                          </span>
                        </div>
                      </div>

                      {/* Image Upload Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-800 cursor-pointer">
                            Question Image (Optional)
                          </label>
                          <button
                            type="button"
                            onClick={toggleQuestionImage}
                            className={`px-4 py-2 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer ${
                              questionForm.hasImage
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {questionForm.hasImage
                              ? "Remove Image Option"
                              : "Add Image"}
                          </button>
                        </div>

                        {questionForm.hasImage && (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                            {!questionForm.imagePreview ? (
                              <div className="text-center">
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-400"
                                  stroke="currentColor"
                                  fill="none"
                                  viewBox="0 0 48 48"
                                >
                                  <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <div className="mt-2">
                                  <label
                                    htmlFor="question-image"
                                    className="cursor-pointer"
                                  >
                                    <span className="text-sm text-gray-600">
                                      Click to upload or drag and drop
                                    </span>
                                    <input
                                      id="question-image"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleQuestionImageChange}
                                      className="hidden"
                                    />
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF up to 2MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <img
                                  src={questionForm.imagePreview}
                                  alt="Question preview"
                                  className="max-h-48 mx-auto rounded-lg shadow-md"
                                />
                                <button
                                  type="button"
                                  onClick={removeQuestionImage}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            )}

                            {errors.questionImage && (
                              <div className="mt-2 text-sm text-red-600 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {errors.questionImage}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Single Answer Input */}
                      {questionForm.questionType === "single" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer *
                          </label>
                          <input
                            type="text"
                            value={questionForm.singleAnswer}
                            onChange={(e) =>
                              setQuestionForm((prev) => ({
                                ...prev,
                                singleAnswer: e.target.value,
                              }))
                            }
                            className={`w-full px-4 py-3 border-2 ${
                              errors.singleAnswer
                                ? "border-red-300"
                                : "border-gray-200"
                            } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white`}
                            placeholder="Enter the correct answer (e.g., 12)"
                          />
                          {errors.singleAnswer && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {errors.singleAnswer}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Multiple Choice Options */}
                      {questionForm.questionType === "multiple" && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Answer Options *
                            </label>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  Max Options:
                                </span>
                                <select
                                  value={questionForm.maxOptions}
                                  onChange={(e) =>
                                    handleMaxOptionsChange(
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="text-xs border border-gray-300 rounded px-2 py-1"
                                >
                                  {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                                    <option key={num} value={num}>
                                      {num}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={shuffleOptions}
                                className="text-xl text-blue-600 hover:text-blue-700 px-3 py-2 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                Shuffle
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {questionForm.options.map((option, index) => (
                              <div
                                key={index}
                                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                                  questionForm.correctAnswer === index
                                    ? "border-green-300 bg-green-50"
                                    : "border-gray-200 hover:border-blue-200"
                                }`}
                              >
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    name="correctAnswer"
                                    checked={
                                      questionForm.correctAnswer === index
                                    }
                                    onChange={() =>
                                      setQuestionForm((prev) => ({
                                        ...prev,
                                        correctAnswer: index,
                                      }))
                                    }
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`text-sm font-semibold px-2 py-1 rounded-full ${
                                      questionForm.correctAnswer === index
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + index)}
                                  </span>
                                </div>
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(index, e.target.value)
                                  }
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`Option ${String.fromCharCode(
                                    65 + index
                                  )}`}
                                />
                                {questionForm.correctAnswer === index && (
                                  <span className="text-green-600 text-sm font-medium">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {errors.options && (
                            <p className="mt-2 text-sm text-red-600 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {errors.options}
                            </p>
                          )}
                        </div>
                      )}

                      {/* True/False Options */}
                      {questionForm.questionType === "truefalse" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Correct Answer *
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            {["True", "False"].map((option, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() =>
                                  setQuestionForm((prev) => ({
                                    ...prev,
                                    correctAnswer: index,
                                  }))
                                }
                                className={`p-4 rounded-lg border-2 transition-all duration-200 font-medium cursor-pointer ${
                                  questionForm.correctAnswer === index
                                    ? "border-green-500 bg-green-50 text-green-700 shadow-md"
                                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                <div className="text-center">
                                  <div className="text-2xl mb-2">
                                    {index === 0 ? "✅" : "❌"}
                                  </div>
                                  <div>{option}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation
                        </label>
                        <textarea
                          value={questionForm.explanation}
                          onChange={(e) =>
                            setQuestionForm((prev) => ({
                              ...prev,
                              explanation: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 resize-none"
                          placeholder="Explain why this is the correct answer..."
                          draggable={false}
                        />
                      </div>

                      {/* Add Question Button */}
                      <button
                        type="button"
                        onClick={addQuestion}
                        disabled={
                          (courseQuestions[currentDifficultyForQuestions] || [])
                            .length >=
                          (difficultySettings[currentDifficultyForQuestions]
                            ?.maxQuestions || 0)
                        }
                        className={`w-full py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 font-medium cursor-pointer ${
                          (courseQuestions[currentDifficultyForQuestions] || [])
                            .length >=
                          (difficultySettings[currentDifficultyForQuestions]
                            ?.maxQuestions || 0)
                            ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transform hover:scale-105"
                        }`}
                      >
                        <Plus className="h-5 w-5" />
                        <span>
                          {(
                            courseQuestions[currentDifficultyForQuestions] || []
                          ).length >=
                          (difficultySettings[currentDifficultyForQuestions]
                            ?.maxQuestions || 0)
                            ? "Maximum Questions Reached"
                            : "Add Question"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {
                            difficultyOptions.find(
                              (d) => d.value === currentDifficultyForQuestions
                            )?.label
                          }{" "}
                          Questions
                        </h4>
                        <span className="text-sm text-gray-600">
                          {
                            (
                              courseQuestions[currentDifficultyForQuestions] ||
                              []
                            ).length
                          }{" "}
                          /{" "}
                          {difficultySettings[currentDifficultyForQuestions]
                            ?.maxQuestions || 0}
                        </span>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {(
                        courseQuestions[currentDifficultyForQuestions] || []
                      ).map((question, index) => (
                        <div
                          key={question.id}
                          className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-500">
                                  #{index + 1}
                                </span>
                                <div className="flex items-center space-x-1">
                                  <Target className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {question.marks} marks
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">
                                    {question.timeLimit}s
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                                {question.question}
                              </p>
                              <div className="flex items-center space-x-2 mb-1">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    question.questionType === "multiple"
                                      ? "bg-blue-100 text-blue-700"
                                      : question.questionType === "single"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-purple-100 text-purple-700"
                                  }`}
                                >
                                  {
                                    questionTypes.find(
                                      (t) => t.value === question.questionType
                                    )?.label
                                  }
                                </span>
                              </div>
                              {question.questionType === "multiple" ||
                              question.questionType === "truefalse" ? (
                                <div className="text-xs text-gray-600 space-y-1">
                                  {question.options.map((option, index) => (
                                    <div
                                      key={index}
                                      className={`flex items-center space-x-1 ${
                                        question.correctAnswer === index
                                          ? "text-green-600 font-medium"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      <span className="text-xs">
                                        {String.fromCharCode(65 + index)})
                                      </span>
                                      <span>{option}</span>
                                      {question.correctAnswer === index && (
                                        <span className="text-green-600">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-600">
                                  ✓ {question.singleAnswer}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                type="button"
                                onClick={() => setPreviewQuestion(question)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition-all duration-200 cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  removeQuestion(
                                    currentDifficultyForQuestions,
                                    question.id
                                  )
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-all duration-200 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(courseQuestions[currentDifficultyForQuestions] || [])
                        .length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p>No questions added yet</p>
                          <p className="text-sm">
                            Add your first question using the form
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress for current difficulty */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        {
                          (courseQuestions[currentDifficultyForQuestions] || [])
                            .length
                        }{" "}
                        /{" "}
                        {difficultySettings[currentDifficultyForQuestions]
                          ?.maxQuestions || 0}
                      </span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            ((
                              courseQuestions[currentDifficultyForQuestions] ||
                              []
                            ).length /
                              (difficultySettings[currentDifficultyForQuestions]
                                ?.maxQuestions || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Show validation errors for questions */}
                  {selectedDifficulties.map((difficulty) => {
                    const questions = courseQuestions[difficulty] || [];
                    const requiredQuestions =
                      difficultySettings[difficulty]?.maxQuestions || 0;
                    const remaining = requiredQuestions - questions.length;

                    if (remaining > 0) {
                      return (
                        <div
                          key={difficulty}
                          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md"
                        >
                          <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                            <span className="text-sm text-yellow-800">
                              Need {remaining} more questions for{" "}
                              {
                                difficultyOptions.find(
                                  (d) => d.value === difficulty
                                )?.label
                              }
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {/* Only show if course is paid */}
            {!courseData.isPaid ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  Video content is only available for paid courses.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Enable "Paid Course" in Basic Info to add videos.
                </p>
              </div>
            ) : (
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Video Content
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    Add 1-2 embeddable video links (YouTube, Vimeo, etc.)
                  </span>
                </div>

                {/* Video Type Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Video Type
                    </label>
                    <select
                      value={videoType}
                      onChange={(e) => setVideoType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="none">No Videos</option>
                      <option value="course">
                        Course-Level Videos (Same for all difficulties)
                      </option>
                      <option value="difficulty">
                        Difficulty-Specific Videos
                      </option>
                    </select>
                  </div>

                  {/* Course-Level Video Links */}
                  {videoType === "course" && (
                    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">
                        Course Video Links
                      </h4>

                      {courseVideoLinks.map((link, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <div className="flex-1 space-y-2">
                              <input
                                type="url"
                                placeholder="https://youtube.com/watch?v=..."
                                value={link.url}
                                onChange={(e) => {
                                  const newLinks = [...courseVideoLinks];
                                  newLinks[index].url = e.target.value;
                                  setCourseVideoLinks(newLinks);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              />
                              <input
                                type="text"
                                placeholder="Video title (optional)"
                                value={link.title}
                                onChange={(e) => {
                                  const newLinks = [...courseVideoLinks];
                                  newLinks[index].title = e.target.value;
                                  setCourseVideoLinks(newLinks);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                              />
                            </div>

                            {/* Remove button */}
                            {courseVideoLinks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCourseVideoLinks(
                                    courseVideoLinks.filter(
                                      (_, i) => i !== index
                                    )
                                  );
                                }}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Platform badge */}
                          {link.url && (
                            <div className="text-xs">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                ✓ {detectPlatform(link.url)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Link Button */}
                      {courseVideoLinks.length < 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourseVideoLinks([
                              ...courseVideoLinks,
                              { url: "", title: "" },
                            ]);
                          }}
                          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                        >
                          + Add Video Link ({courseVideoLinks.length}/2)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Difficulty-Specific Video Links */}
                  {videoType === "difficulty" && (
                    <div className="space-y-4">
                      {selectedDifficulties.length === 0 ? (
                        // Handle case where no difficulties selected yet
                        <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                          <p className="text-yellow-800 font-medium">
                            No Difficulty Levels Selected
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Go back to Step 2 and select difficulty levels first
                          </p>
                          <button
                            onClick={() => setCurrentStep(2)}
                            className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                          >
                            Go to Step 2
                          </button>
                        </div>
                      ) : (
                        // Use selectedDifficulties instead of courseData.difficulties
                        selectedDifficulties.map((difficultyName) => {
                          // Get difficulty settings for marks display
                          const diffSettings =
                            difficultySettings[difficultyName];

                          // Initialize video links if not exists
                          if (!difficultyVideoLinks[difficultyName]) {
                            setDifficultyVideoLinks((prev) => ({
                              ...prev,
                              [difficultyName]: [{ url: "", title: "" }],
                            }));
                          }

                          return (
                            <div
                              key={difficultyName}
                              className={`p-4 rounded-lg ${
                                difficultyName === "easy"
                                  ? "bg-green-50 dark:bg-green-900/20"
                                  : difficultyName === "medium"
                                  ? "bg-yellow-50 dark:bg-yellow-900/20"
                                  : "bg-red-50 dark:bg-red-900/20"
                              }`}
                            >
                              <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                                <span className="capitalize">
                                  {difficultyName} Difficulty Videos
                                </span>
                                {diffSettings && (
                                  <span className="text-xs text-gray-600">
                                    {diffSettings.marksPerQuestion}{" "}
                                    marks/question
                                  </span>
                                )}
                              </h4>

                              {(difficultyVideoLinks[difficultyName] || []).map(
                                (link, index) => (
                                  <div key={index} className="space-y-2 mb-3">
                                    <div className="flex items-start space-x-2">
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="url"
                                          placeholder="https://youtube.com/watch?v=..."
                                          value={link.url || ""}
                                          onChange={(e) => {
                                            const newLinks = {
                                              ...difficultyVideoLinks,
                                            };
                                            if (!newLinks[difficultyName])
                                              newLinks[difficultyName] = [];
                                            newLinks[difficultyName][index] = {
                                              ...newLinks[difficultyName][
                                                index
                                              ],
                                              url: e.target.value,
                                            };
                                            setDifficultyVideoLinks(newLinks);
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Video title (optional)"
                                          value={link.title || ""}
                                          onChange={(e) => {
                                            const newLinks = {
                                              ...difficultyVideoLinks,
                                            };
                                            newLinks[difficultyName][index] = {
                                              ...newLinks[difficultyName][
                                                index
                                              ],
                                              title: e.target.value,
                                            };
                                            setDifficultyVideoLinks(newLinks);
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
                                        />
                                      </div>

                                      {/* Remove button */}
                                      {(
                                        difficultyVideoLinks[difficultyName] ||
                                        []
                                      ).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newLinks = {
                                              ...difficultyVideoLinks,
                                            };
                                            newLinks[difficultyName] = newLinks[
                                              difficultyName
                                            ].filter((_, i) => i !== index);
                                            setDifficultyVideoLinks(newLinks);
                                          }}
                                          className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>

                                    {/* Platform badge */}
                                    {link.url && (
                                      <div className="text-xs">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                          ✓ {detectPlatform(link.url)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}

                              {/* Add Link Button */}
                              {(!difficultyVideoLinks[difficultyName] ||
                                difficultyVideoLinks[difficultyName].length <
                                  2) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newLinks = {
                                      ...difficultyVideoLinks,
                                    };
                                    if (!newLinks[difficultyName])
                                      newLinks[difficultyName] = [];
                                    newLinks[difficultyName].push({
                                      url: "",
                                      title: "",
                                    });
                                    setDifficultyVideoLinks(newLinks);
                                  }}
                                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                >
                                  + Add Video Link (
                                  {
                                    (difficultyVideoLinks[difficultyName] || [])
                                      .length
                                  }
                                  /2)
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Supported Platforms Info */}
                <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    <strong>Supported platforms:</strong> YouTube, Vimeo,
                    Dailymotion, Wistia
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                    <strong>Note:</strong> Videos must be publicly embeddable.
                    Private videos will not work.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Preview & Save Course
              </h3>
              <p className="text-gray-600">
                Review your course details before saving
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Course Overview */}
              <div className="space-y-6">
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Course Details
                  </h4>

                  <div className="space-y-4">
                    {(courseData.image || courseData.thumbnail) && (
                      <div>
                        <img
                          src={
                            courseData.image ||
                            (courseData.thumbnail instanceof File
                              ? URL.createObjectURL(courseData.thumbnail)
                              : courseData.thumbnail)
                          }
                          alt="Course thumbnail"
                          className="w-full h-32 sm:h-40 object-cover rounded-md"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Title
                      </label>
                      <p className="text-gray-900">{courseData.title}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Description
                      </label>
                      <p className="text-gray-900 text-sm">
                        {courseData.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Maximum Marks
                        </label>
                        <p className="text-gray-900">{courseData.maxMarks}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Total Questions
                        </label>
                        <p className="text-gray-900">
                          {Object.values(courseQuestions).flat().length}
                        </p>
                      </div>
                    </div>

                    {courseData.categoryId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Category
                        </label>
                        <p className="text-gray-900">
                          {contextCategories.find(
                            (cat) => cat._id === courseData.categoryId
                          )?.name || "Unknown"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Difficulty Summary */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Difficulty Levels
                  </h4>

                  <div className="space-y-3">
                    {selectedDifficulties.map((difficulty) => {
                      const setting = difficultySettings[difficulty];
                      const questions = courseQuestions[difficulty] || [];
                      const difficultyInfo = difficultyOptions.find(
                        (d) => d.value === difficulty
                      );

                      return (
                        <div
                          key={difficulty}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center space-x-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${difficultyInfo?.color}`}
                            >
                              {difficultyInfo?.label}
                            </span>
                            <div className="text-sm">
                              <div className="flex items-center space-x-4">
                                <span>
                                  {questions.length}/{setting?.maxQuestions}{" "}
                                  questions
                                </span>
                                <span>
                                  {setting?.marksPerQuestion} marks each
                                </span>
                                <span>{setting?.timeLimit}s per question</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {(setting?.marksPerQuestion || 0) *
                                (setting?.maxQuestions || 0)}{" "}
                              marks
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ADD THIS COUPON PREVIEW SECTION */}
              {courseData.isPaid && (
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Tag className="h-5 w-5 text-purple-500 mr-2" />
                    <span>Coupons (Optional)</span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Coupons can be added after the course is created from the
                    course management page.
                  </p>
                </div>
              )}
              {/* Questions Preview */}
              <div className="space-y-4">
                <div className="bg-white border rounded-lg">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h4 className="font-medium text-gray-900">
                      Questions Summary
                    </h4>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {selectedDifficulties.map((difficulty) => {
                      const questions = courseQuestions[difficulty] || [];
                      const difficultyInfo = difficultyOptions.find(
                        (d) => d.value === difficulty
                      );

                      return (
                        <div
                          key={difficulty}
                          className="p-4 border-b last:border-b-0"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${difficultyInfo?.color}`}
                            >
                              {difficultyInfo?.label}
                            </span>
                            <span className="text-sm text-gray-600">
                              {questions.length} questions
                            </span>
                          </div>

                          <div className="space-y-2">
                            {questions.slice(0, 3).map((question, index) => (
                              <div
                                key={question.id}
                                className="text-sm text-gray-700 bg-gray-50 p-2 rounded"
                              >
                                <span className="font-medium">
                                  Q{index + 1}:
                                </span>{" "}
                                {question.question.substring(0, 60)}
                                {question.question.length > 60 && "..."}
                              </div>
                            ))}
                            {questions.length > 3 && (
                              <div className="text-sm text-gray-500 text-center">
                                +{questions.length - 3} more questions
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Save Actions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-blue-900">
                        Ready to Save
                      </h4>
                      <p className="text-sm text-blue-700">
                        Course is complete and ready to be saved
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>

                  <button
                    onClick={handleSaveCourse}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Saving Course...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Course</span>
                      </>
                    )}
                  </button>

                  {errors.submit && (
                    <p className="mt-2 text-sm text-red-600 text-center">
                      {errors.submit}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Course
              </h1>
              <p className="text-gray-600">
                Follow the steps to create a comprehensive course
              </p>
            </div>
            <button
              onClick={handleExitAttempt}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Exit</span>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            {/* Desktop View */}
            <div className="hidden md:flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center space-x-3 ${
                      index < steps.length - 1 ? "flex-1" : ""
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shadow-sm transition-all duration-200 ${
                        currentStep === step.id
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : currentStep > step.id
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    <div
                      className={`transition-colors duration-200 ${
                        currentStep >= step.id
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                    >
                      <div className="text-sm font-medium">{step.title}</div>
                      <div className="text-xs text-gray-500">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-colors duration-300 ${
                        currentStep > step.id ? "bg-green-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              <div className="flex items-center justify-center mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg transition-all duration-200 ${
                    currentStep <= 5
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {currentStep > 5 ? (
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    currentStep
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {steps[currentStep - 1]?.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {steps[currentStep - 1]?.description}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Step {currentStep} of {steps.length}
                </div>
              </div>

              {/* Mobile Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round((currentStep / steps.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(currentStep / 6) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>

            <button
              onClick={nextStep}
              disabled={currentStep === 6}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Question Preview Modal */}
        {previewQuestion && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Question Preview
                </h3>
                <button
                  onClick={() => setPreviewQuestion(null)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      difficultyOptions.find(
                        (d) => d.value === previewQuestion.difficulty
                      )?.color || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {difficultyOptions.find(
                      (d) => d.value === previewQuestion.difficulty
                    )?.label || "Unknown"}
                  </span>
                  <div className="flex items-center space-x-1">
                    <Target className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {previewQuestion.marks} marks
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {previewQuestion.timeLimit}s
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${
                      previewQuestion.questionType === "multiple"
                        ? "bg-blue-100 text-blue-700"
                        : previewQuestion.questionType === "single"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {questionTypes.find(
                      (t) => t.value === previewQuestion.questionType
                    )?.label || "Unknown"}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {previewQuestion.question}
                  </p>
                </div>

                {/* Question Image */}
                {previewQuestion.hasImage && previewQuestion.imagePreview && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Image:</h4>
                    <img
                      src={previewQuestion.imagePreview}
                      alt="Question image"
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                )}

                {/* Show options for multiple choice and true/false */}
                {(previewQuestion.questionType === "multiple" ||
                  previewQuestion.questionType === "truefalse") &&
                  previewQuestion.options && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Options:
                      </h4>
                      <div className="space-y-2">
                        {previewQuestion.options.map((option, index) => (
                          <div
                            key={index}
                            className={`p-3 border rounded-lg ${
                              index === previewQuestion.correctAnswer
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-500 min-w-[20px]">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              <span
                                className={`flex-1 ${
                                  index === previewQuestion.correctAnswer
                                    ? "text-green-700 font-medium"
                                    : "text-gray-700"
                                }`}
                              >
                                {option}
                              </span>
                              {index === previewQuestion.correctAnswer && (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Correct
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Show single answer */}
                {previewQuestion.questionType === "single" &&
                  previewQuestion.singleAnswer && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Correct Answer:
                      </h4>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 font-medium">
                            {previewQuestion.singleAnswer}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {previewQuestion.explanation && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Explanation:
                    </h4>
                    <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {previewQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exit Confirmation Modal */}
        {showExitModal && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Exit
                </h3>
              </div>

              <p className="text-gray-600 mb-6">
                You have unsaved changes. Are you sure you want to exit? All
                progress will be lost.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </div>
        )}
        {showFormatModal && <FormatModal />}
        <AIPromptModal
          showModal={showAIPromptModal}
          setShowModal={setShowAIPromptModal}
          localCourseName={localCourseName}
          setLocalCourseName={setLocalCourseName}
          aiPromptCourseName={aiPromptCourseName}
          setAIPromptCourseName={setAIPromptCourseName}
          generatedPrompt={generatedPrompt}
          setGeneratedPrompt={setGeneratedPrompt}
          generateAIPrompt={generateAIPrompt}
          localQuestionCount={localQuestionCount}
          setLocalQuestionCount={setLocalQuestionCount}
          localIsPaid={localIsPaid}
          setLocalIsPaid={setLocalIsPaid}
          localPrice={localPrice}
          setLocalPrice={setLocalPrice}
          categories={contextCategories}
        />
      </div>
    </>
  );
};

export default CreateCourse;
