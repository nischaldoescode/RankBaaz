import { body, validationResult } from "express-validator";
import Course from "../Models/Course.js";
import TestResult from "../Models/TestResult.js";
import User from "../Models/User.js";
import { v2 as cloudinary } from "cloudinary";
import Category from "../Models/Category.js";
import mongoose from "mongoose";
import videoProcessingService from "../services/videoProcessingService.js";
import questionCacheService from "../services/questionCacheService.js";

export const parseFormDataArrays = (req, res, next) => {
  if (req.body.difficulties && typeof req.body.difficulties === "string") {
    try {
      req.body.difficulties = JSON.parse(req.body.difficulties);
    } catch (error) {
      console.error("Error parsing difficulties:", error);
    }
  }

  if (req.body.questions && typeof req.body.questions === "string") {
    try {
      req.body.questions = JSON.parse(req.body.questions);
    } catch (error) {
      console.error("Error parsing questions:", error);
    }
  }
  next();
};

// Course validation rules
export const courseValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Course name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("difficulties")
    .isArray({ min: 1 })
    .withMessage("At least one difficulty level is required"),

  body("difficulties.*.name")
    .isIn(["Easy", "Medium", "Hard"])
    .withMessage("Difficulty must be Easy, Medium, or Hard"),

  body("difficulties.*.marksPerQuestion")
    .isInt({ min: 1, max: 10 })
    .withMessage("Marks per question must be between 1 and 10"),
  body("difficulties.*.timerSettings.minTime")
    .isInt({ min: 1 })
    .withMessage("Minimum time must be at least 1 minute"),

  body("difficulties.*.timerSettings.maxTime")
    .isInt({ min: 1 })
    .withMessage("Maximum time must be at least 1 minute"),

  body("difficulties.*.timerSettings.maxTime").custom(
    (value, { req, path }) => {
      const index = path.split("[")[1].split("]")[0];
      const minTime = req.body.difficulties[index].timerSettings.minTime;
      if (value < minTime) {
        throw new Error(
          "Maximum time must be greater than or equal to minimum time"
        );
      }
      return true;
    }
  ),
  body("maxQuestionsPerTest")
    .optional()
    .isInt({ min: 2 })
    .withMessage("Max questions per test must be at least 2"),
  body("isPaid")
    .custom((value) => {
      // Accept both boolean and string representations
      return (
        value === true ||
        value === false ||
        value === "true" ||
        value === "false"
      );
    })
    .withMessage("isPaid must be a boolean value"),

  body("price").custom((value, { req }) => {
    const isPaidBoolean =
      req.body.isPaid === "true" || req.body.isPaid === true;

    // Only validate price if course is paid
    if (isPaidBoolean) {
      if (!value || value <= 0) {
        throw new Error("Price must be greater than 0 for paid courses");
      }
      if (value > 100000) {
        throw new Error("Price cannot exceed ₹1,00,000");
      }
    }
    // For free courses, always return true (no validation needed)
    return true;
  }),

  body("currency").optional().isIn(["INR"]).withMessage("Currency must be INR"),
];

// Question validation rules for course questions
export const updateCourseValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Course name must be between 2 and 50 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Description must not exceed 1000 characters"),

  body("difficulties")
    .optional()
    .isArray({ min: 1 })
    .withMessage(
      "At least one difficulty level is required when updating difficulties"
    ),

  body("difficulties.*.name")
    .optional()
    .isIn(["Easy", "Medium", "Hard"])
    .withMessage("Difficulty must be Easy, Medium, or Hard"),

  body("difficulties.*.marksPerQuestion")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Marks per question must be between 1 and 100"),

  body("difficulties.*.timerSettings.minTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Minimum time must be at least 1"),

  body("difficulties.*.timerSettings.maxTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Maximum time must be at least 1 minute"),

  body("difficulties.*.timerSettings.maxTime")
    .optional()
    .custom((value, { req, path }) => {
      if (!req.body.difficulties) return true; // Skip if no difficulties being updated
      const index = path.split("[")[1].split("]")[0];
      const minTime = req.body.difficulties[index].timerSettings.minTime;
      if (value < minTime) {
        throw new Error(
          "Maximum time must be greater than or equal to minimum time"
        );
      }
      return true;
    }),

  body("maxQuestionsPerTest")
    .optional()
    .isInt({ min: 2 })
    .withMessage("Max questions per test must be 2"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
  body("isPaid")
    .custom((value) => {
      // Accept both boolean and string representations
      return (
        value === true ||
        value === false ||
        value === "true" ||
        value === "false"
      );
    })
    .withMessage("isPaid must be a boolean value"),

  body("price").custom((value, { req }) => {
    const isPaidBoolean =
      req.body.isPaid === "true" || req.body.isPaid === true;

    // Only validate price if course is paid
    if (isPaidBoolean) {
      if (!value || value <= 0) {
        throw new Error("Price must be greater than 0 for paid courses");
      }
      if (value > 500000) {
        throw new Error("Price cannot exceed ₹50,000");
      }
    }
    // For free courses, always return true (no validation needed)
    return true;
  }),
];
export const questionValidation = [
  body("questions")
    .optional()
    .isArray()
    .withMessage("Questions must be an array"),

  body("questions.*.difficulty")
    .isIn(["Easy", "Medium", "Hard"])
    .withMessage("Difficulty must be Easy, Medium, or Hard"),

  body("questions.*.question")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Question must be between 10 and 1000 characters"),

  body("questions.*.explanation")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Explanation must be between 10 and 2000 characters"),
  body("questions.*.questionType")
    .optional()
    .isIn(["multiple", "single", "truefalse"])
    .withMessage("Question type must be multiple, single, or truefalse"),

  body("questions.*.options")
    .optional()
    .isArray()
    .withMessage("Options must be an array"),

  body("questions.*.correctAnswer").custom((value, { req, path }) => {
    const index = path.split("[")[1].split("]")[0];
    const question = req.body.questions[index];

    if (
      question.questionType === "multiple" ||
      question.questionType === "truefalse"
    ) {
      if (typeof value !== "number") {
        throw new Error(
          "Correct answer must be an index for multiple choice/true-false"
        );
      }
    } else if (question.questionType === "single") {
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(
          "Correct answer must be a non-empty string for single answer"
        );
      }
    }
    return true;
  }),
];

export const createCourse = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());

      // Cleanup uploaded files on validation failure
      if (req.files) {
        try {
          // Delete course image if uploaded
          if (req.files.image && req.files.image[0]) {
            await cloudinary.uploader.destroy(req.files.image[0].filename);
            console.log(
              "Deleted course image due to validation failure:",
              req.files.image[0].filename
            );
          }

          // Delete question images if uploaded
          if (req.files.questionImages && req.files.questionImages.length > 0) {
            for (const file of req.files.questionImages) {
              await cloudinary.uploader.destroy(file.filename);
              console.log(
                "Deleted question image due to validation failure:",
                file.filename
              );
            }
          }
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded files:", cleanupError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      name,
      description,
      difficulties,
      maxQuestionsPerTest,
      questions,
      isPaid,
      price,
    } = req.body;
    const isPaidBoolean =
      isPaid === "true" || isPaid === true || isPaid === 1 || isPaid === "1";
    let parsedQuestions = [];
    if (questions) {
      try {
        parsedQuestions =
          typeof questions === "string" ? JSON.parse(questions) : questions;

        if (parsedQuestions && Array.isArray(parsedQuestions)) {
          let questionImageIndex = 0;

          parsedQuestions = parsedQuestions.map((question, questionIndex) => {
            // Remove frontend-only properties
            const {
              questionImage,
              imagePreview,
              hasImageAtIndex,
              ...cleanQuestion
            } = question;

            // Check if THIS specific question has an image
            if (
              hasImageAtIndex !== undefined &&
              hasImageAtIndex === questionIndex &&
              req.files &&
              req.files.questionImages &&
              req.files.questionImages[questionImageIndex]
            ) {
              console.log(`Assigning image to question ${questionIndex}:`, {
                public_id:
                  req.files.questionImages[questionImageIndex].filename,
                url: req.files.questionImages[questionImageIndex].path,
              });

              cleanQuestion.image = {
                public_id:
                  req.files.questionImages[questionImageIndex].filename,
                url: req.files.questionImages[questionImageIndex].path,
              };
              questionImageIndex++;
            } else {
              console.log(`No image for question ${questionIndex}`);
            }

            return cleanQuestion;
          });

          console.log(
            "Final parsed questions with images:",
            JSON.stringify(parsedQuestions, null, 2)
          );
        }
      } catch (error) {
        console.error("Error parsing questions:", error);
        // Cleanup uploaded files on error
        if (req.files) {
          try {
            if (req.files.image && req.files.image[0]) {
              await cloudinary.uploader.destroy(req.files.image[0].filename);
            }
            if (
              req.files.questionImages &&
              req.files.questionImages.length > 0
            ) {
              for (const file of req.files.questionImages) {
                await cloudinary.uploader.destroy(file.filename);
              }
            }
          } catch (cleanupError) {
            console.error("Error cleaning up uploaded files:", cleanupError);
          }
        }
        return res.status(400).json({
          success: false,
          message: "Failed to parse questions data",
        });
      }
    }

    // Handle course image upload
    let image = null;
    if (req.files && req.files.image && req.files.image[0]) {
      console.log("Course image uploaded successfully:", {
        public_id: req.files.image[0].filename,
        url: req.files.image[0].path,
        size: req.files.image[0].size,
      });
      image = {
        public_id: req.files.image[0].filename,
        url: req.files.image[0].path,
      };
    } else {
      console.log("No course image file uploaded");
    }

    //Handle video LINKS ONLY for paid courses
    let videoContent = {
      type: "none",
      courseVideo: { links: [] },
      difficultyVideos: [],
    };

    if (isPaidBoolean) {
      const videoType = req.body.videoType || "none";

      if (videoType === "course") {
        // Handle course-level video LINKS ONLY
        if (req.body.courseVideoLinks) {
          try {
            const links =
              typeof req.body.courseVideoLinks === "string"
                ? JSON.parse(req.body.courseVideoLinks)
                : req.body.courseVideoLinks;

            if (!Array.isArray(links)) {
              throw new Error("courseVideoLinks must be an array");
            }

            if (links.length === 0) {
              throw new Error(
                "At least 1 video link required for course video"
              );
            }

            if (links.length > 2) {
              throw new Error("Maximum 2 video links allowed for course video");
            }

            // Validate each link
            const validatedLinks = links.map((link) => {
              if (!link.url || typeof link.url !== "string") {
                throw new Error("Each link must have a valid URL");
              }

              if (!videoProcessingService.validateVideoUrl(link.url)) {
                throw new Error(`Invalid video URL: ${link.url}`);
              }

              return {
                url: link.url.trim(),
                platform: videoProcessingService.extractPlatform(link.url),
                title: link.title?.trim() || "Video Lesson",
              };
            });

            videoContent.type = "course";
            videoContent.courseVideo.links = validatedLinks;
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Video links required when videoType is 'course'",
          });
        }
      } else if (videoType === "difficulty") {
        // Handle difficulty-level video LINKS ONLY
        if (req.body.difficultyVideosData) {
          try {
            const diffVideosData =
              typeof req.body.difficultyVideosData === "string"
                ? JSON.parse(req.body.difficultyVideosData)
                : req.body.difficultyVideosData;

            videoContent.type = "difficulty";
            videoContent.difficultyVideos = [];

            // Process each difficulty's links
            for (const [diffName, diffData] of Object.entries(diffVideosData)) {
              if (!diffData.links || !Array.isArray(diffData.links)) {
                throw new Error(`Links required for ${diffName} difficulty`);
              }

              if (diffData.links.length === 0) {
                throw new Error(
                  `At least 1 video link required for ${diffName}`
                );
              }

              if (diffData.links.length > 2) {
                throw new Error(
                  `Maximum 2 video links allowed for ${diffName} difficulty`
                );
              }

              // Validate each link
              const validatedLinks = diffData.links.map((link) => {
                if (!link.url || typeof link.url !== "string") {
                  throw new Error(
                    `Each link must have a valid URL for ${diffName}`
                  );
                }

                if (!videoProcessingService.validateVideoUrl(link.url)) {
                  throw new Error(
                    `Invalid video URL for ${diffName}: ${link.url}`
                  );
                }

                return {
                  url: link.url.trim(),
                  platform: videoProcessingService.extractPlatform(link.url),
                  title: link.title?.trim() || `${diffName} Video`,
                };
              });

              videoContent.difficultyVideos.push({
                difficulty: diffName,
                links: validatedLinks,
              });
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message:
              "Difficulty videos data required when videoType is 'difficulty'",
          });
        }
      }
    }

    // Check if course already exists
    const existingCourse = await Course.findOne({ name: name.trim() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Course with this name already exists",
      });
    }

    // Validate questions if provided
    if (parsedQuestions && parsedQuestions.length > 0) {
      for (const question of parsedQuestions) {
        const difficultyExists = difficulties.find(
          (diff) => diff.name === question.difficulty
        );
        if (!difficultyExists) {
          return res.status(400).json({
            success: false,
            message: `Question difficulty '${question.difficulty}' not configured for this course`,
          });
        }
      }
    }

    let categoryId = null;
    if (
      req.body.category &&
      req.body.category.trim() !== "" &&
      req.body.category !== "null"
    ) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID format",
        });
      }

      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category not found",
        });
      }

      categoryId = category._id;
    }

    // Calculate maxQuestionsPerTest and add totalMarks to each difficulty
    const processedDifficulties = difficulties.map((diff) => ({
      ...diff,
      totalMarks: diff.marksPerQuestion * diff.maxQuestions,
    }));

    const calculatedMaxQuestionsPerTest = processedDifficulties.reduce(
      (total, diff) => total + diff.maxQuestions,
      0
    );

    const courseData = {
      name: name.trim(),
      description: description?.trim(),
      difficulties: processedDifficulties,
      maxQuestionsPerTest: calculatedMaxQuestionsPerTest,
      isPaid: isPaidBoolean,
      currency: "INR",
      questions: parsedQuestions || [],
      totalQuestions: parsedQuestions
        ? parsedQuestions.filter((q) => q.isActive !== false).length
        : 0,
      ...(image && { image }),
      ...(categoryId && { category: categoryId }),
      ...(isPaidBoolean && { videoContent }),
    };

    // Only add price if course is paid
    if (isPaidBoolean) {
      courseData.price = parseFloat(price) || 0;
    }

    const newCourse = new Course(courseData);
    await newCourse.save();

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: { course: newCourse },
    });
  } catch (error) {
    console.error("Create course error:", error);
    console.error("Request body:", JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: "Failed to create course",
    });
  }
};

// Update course
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());

      // Cleanup uploaded file on validation failure
      if (req.file) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
          console.log(
            "Deleted uploaded image due to validation failure:",
            req.file.filename
          );
        } catch (cleanupError) {
          console.error("Error cleaning up uploaded file:", cleanupError);
        }
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const {
      name,
      description,
      difficulties,
      maxQuestionsPerTest,
      isActive,
      categoryId,
      isPaid,
      price,
    } = req.body;

    // Handle image upload
    let image = null;
    if (req.file) {
      image = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    // ✅ SIMPLIFIED: Handle video LINKS ONLY updates
    let videoContentUpdate = null;

    if (req.body.isPaid === "true" || req.body.isPaid === true) {
      const videoType = req.body.videoType;

      if (videoType === "remove") {
        // ✅ Simply remove video content (no Cloudinary cleanup needed)
        videoContentUpdate = {
          type: "none",
          courseVideo: { links: [] },
          difficultyVideos: [],
        };
      } else if (videoType === "course") {
        // ✅ Update course-level video links
        if (req.body.courseVideoLinks) {
          try {
            const links =
              typeof req.body.courseVideoLinks === "string"
                ? JSON.parse(req.body.courseVideoLinks)
                : req.body.courseVideoLinks;

            if (
              !Array.isArray(links) ||
              links.length === 0 ||
              links.length > 2
            ) {
              throw new Error("Course video must have 1-2 links");
            }

            const validatedLinks = links.map((link) => {
              if (!videoProcessingService.validateVideoUrl(link.url)) {
                throw new Error(`Invalid video URL: ${link.url}`);
              }
              return {
                url: link.url.trim(),
                platform: videoProcessingService.extractPlatform(link.url),
                title: link.title?.trim() || "Video Lesson",
              };
            });

            videoContentUpdate = {
              type: "course",
              courseVideo: { links: validatedLinks },
              difficultyVideos: [],
            };
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          }
        }
      } else if (videoType === "difficulty") {
        // Handle difficulty-level video LINKS ONLY (OPTIONAL)
        if (req.body.difficultyVideosData) {
          try {
            const diffVideosData =
              typeof req.body.difficultyVideosData === "string"
                ? JSON.parse(req.body.difficultyVideosData)
                : req.body.difficultyVideosData;

            videoContent.type = "difficulty";
            videoContent.difficultyVideos = [];

            // Process each difficulty's links
            for (const [diffName, diffData] of Object.entries(diffVideosData)) {
              //  SKIP if no links provided (make it optional)
              if (!diffData.links || diffData.links.length === 0) {
                continue; // Skip this difficulty, don't throw error
              }

              // Validate: Maximum 2 links per difficulty
              if (diffData.links.length > 2) {
                throw new Error(
                  `Maximum 2 video links allowed for ${diffName} difficulty`
                );
              }

              // Validate and process links
              const validatedLinks = diffData.links
                .filter((link) => link.url && link.url.trim()) // Filter out empty URLs
                .map((link) => {
                  if (!videoProcessingService.validateVideoUrl(link.url)) {
                    throw new Error(
                      `Invalid video URL for ${diffName}: ${link.url}`
                    );
                  }

                  return {
                    url: link.url.trim(),
                    platform: videoProcessingService.extractPlatform(link.url),
                    title: link.title?.trim() || `${diffName} Video`,
                  };
                });

              // Only add if there are valid links after filtering
              if (validatedLinks.length > 0) {
                videoContent.difficultyVideos.push({
                  difficulty: diffName,
                  links: validatedLinks,
                });
              }
            }

            // If no valid difficulty videos were added, set type to "none"
            if (videoContent.difficultyVideos.length === 0) {
              videoContent.type = "none";
              videoContent.courseVideo = { links: [] };
              videoContent.difficultyVideos = [];
            }
          } catch (error) {
            return res.status(400).json({
              success: false,
              message: error.message,
            });
          }
        } else {
          // No difficultyVideosData provided - that's okay, videos are optional
          videoContent.type = "none";
          videoContent.courseVideo = { links: [] };
          videoContent.difficultyVideos = [];
        }
      }
    } else if (req.body.isPaid === "false" || req.body.isPaid === false) {
      // Changing from paid to free - remove video content
      videoContentUpdate = {
        type: "none",
        courseVideo: { links: [] },
        difficultyVideos: [],
      };
    }

    // Handle category update
    let categoryUpdate = {};
    if (req.body.category !== undefined) {
      if (
        req.body.category === null ||
        req.body.category === "" ||
        req.body.category === "null"
      ) {
        // Remove category
        categoryUpdate.category = null;
      } else {
        // Validate and set new category
        if (!mongoose.Types.ObjectId.isValid(req.body.category)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID format",
          });
        }

        const category = await Category.findById(req.body.category);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: "Category not found",
          });
        }

        categoryUpdate.category = req.body.category; // Changed from categoryId to req.body.category
      }
    }

    // Check if name is being changed and if it already exists
    if (name && name.trim() !== course.name) {
      const existingCourse = await Course.findOne({
        name: name.trim(),
        _id: { $ne: courseId },
      });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: "Course with this name already exists",
        });
      }
    }
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(difficulties && { difficulties }),
      ...(maxQuestionsPerTest && { maxQuestionsPerTest }),
      ...(image && { image }),
      ...(isActive !== undefined && { isActive }),
      ...categoryUpdate,
      ...(videoContentUpdate && { videoContent: videoContentUpdate }),
    };

    // Handle isPaid and price logic
    if (req.body.isPaid !== undefined) {
      const isPaidBoolean =
        req.body.isPaid === "true" || req.body.isPaid === true;
      updateData.isPaid = isPaidBoolean;

      // CRITICAL: Delete videos when changing from paid to free
      if (!isPaidBoolean) {
        const course = await Course.findById(courseId);
        if (course?.videoContent) {
          await deleteAllCourseVideos(course.videoContent);
        }

        videoContentUpdate = {
          type: "none",
          courseVideo: { links: [], uploadedVideo: null },
          difficultyVideos: [],
        };
      }

      if (isPaidBoolean && req.body.price !== undefined) {
        updateData.price = parseFloat(req.body.price);
      } else if (!isPaidBoolean) {
        // If changing from paid to free, set price to 0
        updateData.price = 0;
      }
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
      runValidators: true,
    }).populate("category", "name description");

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: { course: updatedCourse },
    });
  } catch (error) {
    console.error("Update course error:", error);
    console.error(
      "Course ID:",
      req.params.courseId,
      "Update data:",
      JSON.stringify(req.body, null, 2)
    );
    res.status(500).json({
      success: false,
      message: "Failed to update course",
    });
  }
};

const validateVideoLink = (url) => {
  const allowedDomains = [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "dailymotion.com",
    "wistia.com",
  ];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace("www.", "");
    return allowedDomains.some((allowed) => domain.includes(allowed));
  } catch {
    return false;
  }
};

// New endpoint to validate video links
export const validateVideoLinks = async (req, res) => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Links array is required",
      });
    }

    const validationResults = links.map((link) => ({
      url: link,
      isValid: validateVideoLink(link),
    }));

    const allValid = validationResults.every((result) => result.isValid);

    res.status(200).json({
      success: true,
      data: {
        allValid,
        results: validationResults,
      },
    });
  } catch (error) {
    console.error("Validate video links error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate video links",
    });
  }
};

// Delete course
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if course has questions
    if (course.questions && course.questions.length > 0) {
      console.log(
        `Delete attempt blocked: Course ${courseId} has ${course.questions.length} questions`
      );
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete course that has questions. Delete questions first or deactivate the course.",
      });
    }

    // STEP 1: Get all test results for this course BEFORE deletion
    const testResults = await TestResult.find({ course: courseId }).select(
      "user pointsEarned totalQuestions percentage"
    );

    console.log(
      `Found ${testResults.length} test results to process for course ${courseId}`
    );

    // STEP 2: Group by user and calculate what to subtract
    const userUpdates = new Map();

    testResults.forEach((test) => {
      const userId = test.user.toString();

      if (!userUpdates.has(userId)) {
        userUpdates.set(userId, {
          testsToSubtract: 0,
          questionsToSubtract: 0,
          pointsToSubtract: 0,
          percentages: [], // To recalculate average percentile
        });
      }

      const update = userUpdates.get(userId);
      update.testsToSubtract += 1;
      update.questionsToSubtract += test.totalQuestions || 0;
      update.pointsToSubtract += test.pointsEarned || 0;
      update.percentages.push(test.percentage || 0);
    });

    // STEP 3: Update each affected user
    const userUpdatePromises = [];

    for (const [userId, updates] of userUpdates) {
      const user = await User.findById(userId);

      if (user) {
        // Calculate new values
        const newTestsCompleted = Math.max(
          0,
          (user.stats.testsCompleted || 0) - updates.testsToSubtract
        );
        const newQuestionsAnswered = Math.max(
          0,
          (user.stats.questionsAnswered || 0) - updates.questionsToSubtract
        );
        const newPoints = Math.max(
          0,
          (user.points || 0) - updates.pointsToSubtract
        );

        // Recalculate average percentile (excluding this course's tests)
        // Get remaining tests for this user from OTHER courses
        const remainingTests = await TestResult.find({
          user: userId,
          course: { $ne: courseId }, // Not this course
        }).select("percentage");

        let newAveragePercentile = 0;
        if (remainingTests.length > 0) {
          const totalPercentage = remainingTests.reduce(
            (sum, test) => sum + (test.percentage || 0),
            0
          );
          newAveragePercentile = totalPercentage / remainingTests.length;
        }

        // Update user document
        userUpdatePromises.push(
          User.findByIdAndUpdate(userId, {
            $set: {
              "stats.testsCompleted": newTestsCompleted,
              "stats.questionsAnswered": newQuestionsAnswered,
              "stats.averagePercentile": Math.round(newAveragePercentile),
              points: newPoints,
            },
          })
        );

        console.log(
          `Will update user ${userId}: -${updates.testsToSubtract} tests, -${updates.pointsToSubtract} points`
        );
      }
    }

    // Execute all user updates in parallel
    await Promise.all(userUpdatePromises);
    console.log(`Updated ${userUpdatePromises.length} users' stats`);

    // STEP 4: Now delete all test results for this course
    const deletedTestResults = await TestResult.deleteMany({
      course: courseId,
    });
    console.log(
      `Deleted ${deletedTestResults.deletedCount} test results for course ${courseId}`
    );

    // STEP 5: Clear Redis leaderboard caches for this course
    try {
      const redisClient = (await import("../Config/redis.js")).default;
      const difficulties = ["Easy", "Medium", "Hard", "all"];

      for (const diff of difficulties) {
        const leaderboardKey = `leaderboard:${courseId}:${diff}`;
        const pointsKey = `leaderboard:points:${courseId}:${diff}`;
        await redisClient.del(leaderboardKey);
        await redisClient.del(pointsKey);
      }

      // Also clear global leaderboard since points changed
      await redisClient.del("global:leaderboard:points");

      console.log(`Cleared Redis leaderboard caches for course ${courseId}`);
    } catch (redisError) {
      console.error("Failed to clear Redis caches:", redisError);
      // Continue even if Redis fails
    }

    // Delete associated Cloudinary image if exists
    if (course.image && course.image.public_id) {
      try {
        await cloudinary.uploader.destroy(course.image.public_id);
        console.log("Cloudinary image deleted:", course.image.public_id);
      } catch (cloudinaryError) {
        console.error("Failed to delete Cloudinary image:", cloudinaryError);
        // Continue with course deletion even if image deletion fails
      }
    }

    await Course.findByIdAndDelete(courseId);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
    });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const isActive = req.query.isActive;
    const isAdmin = req.user?.role === "admin";
    const { category, difficulty, isPaid, sortBy = "newest" } = req.query;

    // Base query - only show active courses for non-admin users
    const baseQuery = isAdmin ? {} : { isActive: true };

    let filterQuery = { ...baseQuery };

    // Add search filter
    if (search) {
      filterQuery.name = { $regex: search, $options: "i" };
    }

    // Add status filter
    if (isActive !== undefined) {
      filterQuery.isActive = isActive === "true";
    }

    // Add category filter
    if (category) {
      filterQuery.category = new mongoose.Types.ObjectId.createFromHexString(
        category
      );
    }

    // Add difficulty filter
    if (difficulty) {
      filterQuery["difficulties.name"] = difficulty;
    }

    // Add price filter
    if (isPaid !== undefined) {
      filterQuery.isPaid = isPaid === "true" || isPaid === true;
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case "oldest":
        sortCriteria = { createdAt: 1 };
        break;
      case "name":
        sortCriteria = { name: 1 };
        break;
      case "popular":
        sortCriteria = { totalQuestions: -1 };
        break;
      case "newest":
      default:
        sortCriteria = { createdAt: -1 };
        break;
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: filterQuery },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
          pipeline: [{ $project: { name: 1, description: 1, isActive: 1 } }],
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          totalQuestions: {
            $size: {
              $filter: {
                input: { $ifNull: ["$questions", []] },
                cond: { $eq: ["$$this.isActive", true] },
              },
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          isActive: 1,
          isPaid: 1,
          price: 1,
          totalQuestions: 1,
          category: 1,
          image: 1,
          createdAt: 1,
          difficulties: 1,
          maxQuestionsPerTest: 1,
          videoContent: 1,
        },
      },
      { $sort: sortCriteria },
    ];

    const [courses, totalCourses] = await Promise.all([
      Course.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Course.aggregate([{ $match: filterQuery }, { $count: "total" }]).then(
        (result) => result[0]?.total || 0
      ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve courses",
    });
  }
};

// Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId)
      .populate("category", "name description isActive")
      .select("-questions.image")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Add computed totalQuestions field
    course.totalQuestions =
      course.questions?.filter((q) => q.isActive !== false).length || 0;

    if (!course.questions) {
      course.questions = [];
    }

    // ADD THIS: Get active coupons count for paid courses
    if (course.isPaid) {
      const Coupon = (await import("../Models/Coupon.js")).default;
      const activeCouponsCount = await Coupon.countDocuments({
        $or: [{ course: courseId, type: "course" }, { type: "universal" }],
        isActive: true,
      });
      course.activeCouponsCount = activeCouponsCount;
    }

    res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: { course },
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve course",
    });
  }
};

// Add question to course
export const addQuestionToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      difficulty,
      question,
      explanation,
      questionType,
      options,
      correctAnswer,
      correctAnswerIndex,
    } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if difficulty exists in course
    const difficultyExists = course.difficulties.find(
      (diff) => diff.name === difficulty
    );
    if (!difficultyExists) {
      return res.status(400).json({
        success: false,
        message: `Difficulty level '${difficulty}' not configured for this course`,
      });
    }
    let questionImage = null;
    if (req.file) {
      questionImage = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    const newQuestion = {
      difficulty,
      question: question.trim(),
      questionType: questionType || "multiple",
      numberOfOptions:
        questionType === "multiple"
          ? options
            ? options.length
            : 0
          : questionType === "truefalse"
            ? 2
            : 0, // Calculate number of options based on question type
      options:
        questionType === "multiple"
          ? options || []
          : questionType === "truefalse"
            ? ["True", "False"]
            : [],
      correctAnswer:
        questionType === "multiple"
          ? correctAnswerIndex
          : questionType === "truefalse"
            ? correctAnswerIndex
            : correctAnswer,
      explanation: explanation.trim(),
      marksPerQuestion: difficultyExists.marksPerQuestion,
      createdBy: req.admin?.email || "admin",
      ...(questionImage && { image: questionImage }),
    };
    course.questions.push(newQuestion);
    course.totalQuestions = course.questions.filter((q) => q.isActive).length;

    // Recalculate total marks for the course
    course.totalMarks = course.questions
      .filter((q) => q.isActive)
      .reduce((total, q) => total + (q.marksPerQuestion || 0), 0);

    await course.save();

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: { question: newQuestion },
    });
  } catch (error) {
    console.error("Add question error:", error);
    console.error(
      "Course ID:",
      req.params.courseId,
      "Question data:",
      JSON.stringify(req.body, null, 2)
    );
    res.status(500).json({
      success: false,
      message: "Failed to add question",
    });
  }
};

// ADD THIS NEW FUNCTION after getUserStats
export const getDifficultyBreakdown = async (req, res) => {
  try {
    const { courseId, difficulty, timeRange } = req.query;

    console.log("=== getDifficultyBreakdown ===");
    console.log("Filters:", { courseId, difficulty, timeRange });

    // Build match criteria
    const matchCriteria = {};

    if (
      courseId &&
      courseId.trim() !== "" &&
      courseId !== "all" &&
      mongoose.Types.ObjectId.isValid(courseId)
    ) {
      matchCriteria.course = new mongoose.Types.ObjectId(courseId);
    }

    if (timeRange && timeRange.trim() !== "" && timeRange !== "all") {
      const daysAgo =
        timeRange === "30d"
          ? 30
          : timeRange === "1d"
            ? 1
            : timeRange === "90d"
              ? 90
              : 7;
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      matchCriteria.createdAt = { $gte: startDate };
    }

    if (difficulty && difficulty.trim() !== "" && difficulty !== "all") {
      const capitalizedDifficulty =
        difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
      matchCriteria.difficulty = capitalizedDifficulty;
    }

    const testResults = await TestResult.find(matchCriteria)
      .populate("course", "name")
      .lean();

    // Group by course and difficulty
    const breakdown = new Map();

    testResults.forEach((result) => {
      const courseKey = result.course._id.toString();
      const courseName = result.course.name;

      if (!breakdown.has(courseKey)) {
        breakdown.set(courseKey, {
          courseName,
          difficulties: {
            Easy: { totalAttempts: 0, totalScore: 0, totalTime: 0 },
            Medium: { totalAttempts: 0, totalScore: 0, totalTime: 0 },
            Hard: { totalAttempts: 0, totalScore: 0, totalTime: 0 },
          },
        });
      }

      const courseData = breakdown.get(courseKey);
      const isMultiDifficulty =
        Array.isArray(result.difficulty) && result.difficulty.length > 1;

      if (isMultiDifficulty && result.testSettings?.difficultyResults) {
        result.testSettings.difficultyResults.forEach((diffResult) => {
          const diff = diffResult.difficulty;
          if (courseData.difficulties[diff]) {
            const diffPercentage =
              diffResult.maxPossibleScore > 0
                ? (diffResult.totalScore / diffResult.maxPossibleScore) * 100
                : 0;
            courseData.difficulties[diff].totalAttempts += 1;
            courseData.difficulties[diff].totalScore += diffPercentage;
            courseData.difficulties[diff].totalTime +=
              diffResult.timeTaken || 0;
          }
        });
      } else {
        const difficulties = Array.isArray(result.difficulty)
          ? result.difficulty
          : [result.difficulty];
        difficulties.forEach((diff) => {
          if (courseData.difficulties[diff]) {
            courseData.difficulties[diff].totalAttempts += 1;
            courseData.difficulties[diff].totalScore += result.percentage || 0;
            courseData.difficulties[diff].totalTime += result.timeTaken || 0;
          }
        });
      }
    });

    // Format response
    const formattedBreakdown = Array.from(breakdown.entries()).map(
      ([courseId, data]) => ({
        courseId,
        courseName: data.courseName,
        difficulties: Object.entries(data.difficulties)
          .filter(([_, stats]) => stats.totalAttempts > 0)
          .map(([difficulty, stats]) => ({
            difficulty,
            averageScore:
              stats.totalAttempts > 0
                ? Math.round((stats.totalScore / stats.totalAttempts) * 10) / 10
                : 0,
            totalAttempts: stats.totalAttempts,
            averageTime:
              stats.totalAttempts > 0
                ? Math.round(stats.totalTime / stats.totalAttempts)
                : 0,
          })),
      })
    );

    res.status(200).json({
      success: true,
      data: formattedBreakdown,
    });
  } catch (error) {
    console.error("Get difficulty breakdown error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve difficulty breakdown",
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const { courseId, difficulty, timeRange } = req.query;

    console.log("=== getUserStats Query Params ===");
    console.log("Filters:", { courseId, difficulty, timeRange });

    // Build match criteria
    const matchCriteria = {};

    // Course filter
    if (
      courseId &&
      courseId.trim() !== "" &&
      courseId !== "all" &&
      mongoose.Types.ObjectId.isValid(courseId)
    ) {
      matchCriteria.course = new mongoose.Types.ObjectId(courseId);
    }

    // Time range filter
    if (timeRange && timeRange.trim() !== "" && timeRange !== "all") {
      const daysAgo =
        timeRange === "30d"
          ? 30
          : timeRange === "1d"
            ? 1
            : timeRange === "90d"
              ? 90
              : 7;
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      matchCriteria.createdAt = { $gte: startDate };
    }

    // Difficulty filter - handle both single and array difficulties
    if (difficulty && difficulty.trim() !== "" && difficulty !== "all") {
      const difficultyArray = Array.isArray(difficulty)
        ? difficulty
        : [difficulty];
      const capitalizedDifficulties = difficultyArray.map(
        (d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
      );
      matchCriteria.difficulty = { $in: capitalizedDifficulties };
    }

    console.log("Match criteria:", JSON.stringify(matchCriteria, null, 2));

    // PARALLEL EXECUTION - Fetch all data at once
    const [totalUsers, testResults] = await Promise.all([
      User.countDocuments(),
      TestResult.find(matchCriteria)
        .populate("user", "name email points badges")
        .populate("course", "name image category")
        .sort({ createdAt: -1 })
        .limit(1000) // Reasonable limit for performance
        .lean(),
    ]);

    console.log(`Found ${testResults.length} test results`);

    // PROCESS DATA IN MEMORY (Much faster than aggregation)

    // 1. Overview stats
    const uniqueUserIds = new Set();
    let totalScore = 0;
    testResults.forEach((result) => {
      uniqueUserIds.add(result.user._id.toString());
      totalScore += result.percentage || 0;
    });

    const activeUsers = uniqueUserIds.size;
    const totalTests = testResults.length;
    const averageScore =
      totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

    // 2. Top Performers - Group by user
    const userPerformanceMap = new Map();
    testResults.forEach((result) => {
      const userId = result.user._id.toString();
      if (!userPerformanceMap.has(userId)) {
        userPerformanceMap.set(userId, {
          _id: result.user._id,
          name: result.user.name,
          email: result.user.email,
          points: result.user.points || 0,
          badgeCount: result.user.badges?.length || 0,
          totalScore: 0,
          testsCompleted: 0,
          totalQuestions: 0,
          totalCorrect: 0,
        });
      }
      const userStats = userPerformanceMap.get(userId);
      userStats.totalScore += result.percentage || 0;
      userStats.testsCompleted += 1;
      userStats.totalQuestions += result.totalQuestions || 0;
      userStats.totalCorrect += result.correctAnswers || 0;
    });

    const topPerformers = Array.from(userPerformanceMap.values())
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        averageScore:
          Math.round((user.totalScore / user.testsCompleted) * 10) / 10,
        testsCompleted: user.testsCompleted,
        totalQuestions: user.totalQuestions,
        totalCorrect: user.totalCorrect,
        points: user.points,
        badgeCount: user.badgeCount,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // 3. Course Performance
    const coursePerformanceMap = new Map();
    testResults.forEach((result) => {
      const courseId = result.course._id.toString();
      if (!coursePerformanceMap.has(courseId)) {
        coursePerformanceMap.set(courseId, {
          _id: result.course._id,
          name: result.course.name,
          image: result.course.image?.url || null,
          category: "Uncategorized", // Will populate if needed
          totalScore: 0,
          totalAttempts: 0,
          completedTests: 0,
          uniqueUsers: new Set(),
          totalQuestions: 0,
          totalCorrect: 0,
        });
      }
      const courseStats = coursePerformanceMap.get(courseId);
      courseStats.totalScore += result.percentage || 0;
      courseStats.totalAttempts += 1;
      if (result.percentage >= 50) courseStats.completedTests += 1;
      courseStats.uniqueUsers.add(result.user._id.toString());
      courseStats.totalQuestions += result.totalQuestions || 0;
      courseStats.totalCorrect += result.correctAnswers || 0;
    });

    const coursePerformance = Array.from(coursePerformanceMap.values())
      .map((course) => ({
        _id: course._id,
        name: course.name,
        image: course.image,
        category: course.category,
        averageScore:
          Math.round((course.totalScore / course.totalAttempts) * 10) / 10,
        totalAttempts: course.totalAttempts,
        uniqueUsers: course.uniqueUsers.size,
        completionRate:
          Math.round((course.completedTests / course.totalAttempts) * 1000) /
          10,
        accuracyRate:
          course.totalQuestions > 0
            ? Math.round((course.totalCorrect / course.totalQuestions) * 1000) /
              10
            : 0,
      }))
      .sort((a, b) => b.totalAttempts - a.totalAttempts);

    // 4. Difficulty Stats - CORRECTED: Separate multi-difficulty from single-difficulty tests
    const difficultyStatsMap = new Map([
      [
        "Easy",
        {
          difficulty: "Easy",
          totalScore: 0,
          totalAttempts: 0,
          totalTime: 0,
          uniqueUsers: new Set(),
          totalQuestions: 0,
          totalCorrect: 0,
        },
      ],
      [
        "Medium",
        {
          difficulty: "Medium",
          totalScore: 0,
          totalAttempts: 0,
          totalTime: 0,
          uniqueUsers: new Set(),
          totalQuestions: 0,
          totalCorrect: 0,
        },
      ],
      [
        "Hard",
        {
          difficulty: "Hard",
          totalScore: 0,
          totalAttempts: 0,
          totalTime: 0,
          uniqueUsers: new Set(),
          totalQuestions: 0,
          totalCorrect: 0,
        },
      ],
    ]);

    testResults.forEach((result) => {
      // Check if this is a multi-difficulty test
      const isMultiDifficulty =
        Array.isArray(result.difficulty) && result.difficulty.length > 1;

      if (isMultiDifficulty) {
        // For multi-difficulty tests, use the detailed breakdown from difficultyResults
        if (result.testSettings?.difficultyResults) {
          result.testSettings.difficultyResults.forEach((diffResult) => {
            const diffKey = diffResult.difficulty;
            if (difficultyStatsMap.has(diffKey)) {
              const stats = difficultyStatsMap.get(diffKey);

              // Use the specific difficulty's data
              const diffPercentage =
                diffResult.maxPossibleScore > 0
                  ? (diffResult.totalScore / diffResult.maxPossibleScore) * 100
                  : 0;

              stats.totalScore += diffPercentage;
              stats.totalAttempts += 1;
              stats.totalTime += diffResult.timeTaken || 0;
              stats.uniqueUsers.add(result.user._id.toString());
              stats.totalQuestions += diffResult.totalQuestions || 0;
              stats.totalCorrect += diffResult.correctAnswers || 0;
            }
          });
        }
      } else {
        // For single-difficulty tests, process normally
        const difficulties = Array.isArray(result.difficulty)
          ? result.difficulty
          : [result.difficulty];

        difficulties.forEach((diff) => {
          const diffKey =
            diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
          if (difficultyStatsMap.has(diffKey)) {
            const stats = difficultyStatsMap.get(diffKey);
            stats.totalScore += result.percentage || 0;
            stats.totalAttempts += 1;
            stats.totalTime += result.timeTaken || 0;
            stats.uniqueUsers.add(result.user._id.toString());
            stats.totalQuestions += result.totalQuestions || 0;
            stats.totalCorrect += result.correctAnswers || 0;
          }
        });
      }
    });

    const difficultyStats = Array.from(difficultyStatsMap.values()).map(
      (stat) => ({
        difficulty: stat.difficulty,
        averageScore:
          stat.totalAttempts > 0
            ? Math.round((stat.totalScore / stat.totalAttempts) * 10) / 10
            : 0,
        totalAttempts: stat.totalAttempts,
        averageTime:
          stat.totalAttempts > 0
            ? Math.round(stat.totalTime / stat.totalAttempts)
            : 0,
        uniqueUsers: stat.uniqueUsers.size,
        accuracyRate:
          stat.totalQuestions > 0
            ? Math.round((stat.totalCorrect / stat.totalQuestions) * 1000) / 10
            : 0,
      })
    );

    // 5. Recent Activity
    const recentActivity = testResults.slice(0, 10).map((result) => ({
      userName: result.user.name,
      userEmail: result.user.email,
      courseName: result.course.name,
      courseImage: result.course.image?.url || null,
      difficulty: Array.isArray(result.difficulty)
        ? result.difficulty.join(", ")
        : result.difficulty,
      percentage: Math.round((result.percentage || 0) * 10) / 10,
      timeTaken: result.timeTaken || 0,
      completedAt: result.completedAt || result.createdAt, // Use completedAt instead of createdAt
      createdAt: result.createdAt,
    }));

    console.log("=== PROCESSED RESULTS ===");
    console.log("Active users:", activeUsers);
    console.log("Total tests:", totalTests);
    console.log("Top performers:", topPerformers.length);
    console.log("Course performance:", coursePerformance.length);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalTests,
        averageScore,
        topPerformers,
        coursePerformance,
        difficultyStats,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user statistics",
    });
  }
};

// Get course statistics
export const getCourseStats = async (req, res) => {
  try {
    // we will Use Promise.all for parallel execution
    const [
      totalCourses,
      activeCourses,
      inactiveCourses,
      totalUsers,
      totalTests,
      courseWithMostQuestions,
      coursesWithQuestions,
      totalQuestionsAcrossAllCourses,
    ] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ isActive: true }),
      Course.countDocuments({ isActive: false }),
      User.countDocuments(),
      TestResult.countDocuments(),
      Course.findOne()
        .sort({ totalQuestions: -1 })
        .select("name totalQuestions")
        .lean(),
      Course.aggregate([
        {
          $project: {
            name: 1,
            totalQuestions: { $size: { $ifNull: ["$questions", []] } },
            activeQuestions: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$questions", []] },
                  cond: { $eq: ["$$this.isActive", true] },
                },
              },
            },
            isActive: 1,
          },
        },
        { $sort: { totalQuestions: -1 } },
      ]),
      Course.aggregate([
        {
          $project: {
            totalQuestions: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$questions", []] },
                  cond: { $eq: ["$$this.isActive", true] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalQuestions" },
          },
        },
      ]),
    ]);

    const totalQuestions = totalQuestionsAcrossAllCourses[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Course statistics retrieved successfully",
      data: {
        overview: {
          totalCourses,
          activeCourses,
          inactiveCourses,
        },
        totalQuestions,
        totalUsers,
        totalTests,
        courseWithMostQuestions,
        coursesWithQuestions,
      },
    });
  } catch (error) {
    console.error("Get course stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve course statistics",
    });
  }
};

export const getCourseQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { difficulty, isActive, page = 1, limit = 50 } = req.query;

    if (
      !courseId ||
      courseId === "undefined" ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID provided",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match conditions
    let matchConditions = {};
    if (difficulty) matchConditions["questions.difficulty"] = difficulty;
    if (isActive !== undefined)
      matchConditions["questions.isActive"] = isActive === "true";

    // Use aggregation for better performance
    const pipeline = [
      {
        $match: { _id: mongoose.Types.ObjectId.createFromHexString(courseId) },
      },
      { $unwind: "$questions" },
      ...(Object.keys(matchConditions).length > 0
        ? [{ $match: matchConditions }]
        : []),
      { $sort: { "questions.createdAt": -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          question: "$questions",
          _id: 0,
        },
      },
    ];

    const [questions, courseExists] = await Promise.all([
      Course.aggregate(pipeline),
      Course.exists({ _id: courseId }),
    ]);

    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const questionData = questions.map((item) => item.question);

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: {
        questions: questionData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: questionData.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get course questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve questions",
    });
  }
};

export const deleteCourseQuestion = async (req, res) => {
  try {
    const { courseId, questionId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const questionIndex = course.questions.findIndex(
      (q) => q._id.toString() === questionId
    );

    if (questionIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Delete question image from Cloudinary before removing question
    const question = course.questions[questionIndex];
    if (question.image && question.image.public_id) {
      try {
        await cloudinary.uploader.destroy(question.image.public_id);
        console.log(`Deleted question image: ${question.image.public_id}`);
      } catch (cloudinaryError) {
        console.error(
          "Failed to delete question image from Cloudinary:",
          cloudinaryError
        );
        // Continue with question deletion even if image deletion fails
      }
    }

    course.questions.splice(questionIndex, 1);
    course.totalQuestions = course.questions.filter(
      (q) => q.isActive !== false
    ).length;

    await course.save();
    try {
      await questionCacheService.invalidateQuestion(courseId, questionId);
      if (Node_ENV === "development") {
        console.log(`Cache invalidated for deleted question ${questionId}`);
      }
    } catch (cacheError) {
      if (Node_ENV === "development") {
        console.error("Failed to invalidate question cache:", cacheError);
      }
    }
    res.status(200).json({
      success: true,
      message: "Question and its image deleted successfully",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
    });
  }
};

export const bulkDeleteQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { questionIds } = req.body;

    if (
      !questionIds ||
      !Array.isArray(questionIds) ||
      questionIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Question IDs array is required",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Collect all image public_ids before deletion
    const imagesToDelete = [];
    const questionsToDelete = course.questions.filter((q) =>
      questionIds.includes(q._id.toString())
    );

    questionsToDelete.forEach((question) => {
      if (question.image && question.image.public_id) {
        imagesToDelete.push(question.image.public_id);
      }
    });

    // Delete all images from Cloudinary
    if (imagesToDelete.length > 0) {
      console.log(
        `Deleting ${imagesToDelete.length} question images from Cloudinary...`
      );

      const deletePromises = imagesToDelete.map((publicId) =>
        cloudinary.uploader.destroy(publicId).catch((err) => {
          console.error(`Failed to delete image ${publicId}:`, err);
          return null; // Continue even if one fails
        })
      );

      await Promise.all(deletePromises);
      console.log(
        `Successfully processed ${imagesToDelete.length} image deletions`
      );
    }

    // Remove questions from course
    const initialLength = course.questions.length;
    course.questions = course.questions.filter(
      (q) => !questionIds.includes(q._id.toString())
    );

    const deletedCount = initialLength - course.questions.length;
    course.totalQuestions = course.questions.filter(
      (q) => q.isActive !== false
    ).length;

    await course.save();

    try {
      const cacheInvalidations = questionIds.map((questionId) =>
        questionCacheService.invalidateQuestion(courseId, questionId)
      );
      await Promise.all(cacheInvalidations);
      if (process.env.NODE_ENV === "development") {
        console.log(`Cache invalidated for ${questionIds.length} questions`);
      }
    } catch (cacheError) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to bulk invalidate question cache:", cacheError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} question(s) and ${imagesToDelete.length} image(s)`,
      deletedCount,
      imagesDeleted: imagesToDelete.length,
    });
  } catch (error) {
    console.error("Bulk delete questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete questions",
    });
  }
};

export const updateCourseQuestion = async (req, res) => {
  try {
    const { courseId, questionId } = req.params;
    const updates = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const question = course.questions.id(questionId);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Handle image upload if present
    if (req.file) {
      // Delete old image if exists
      if (question.image && question.image.public_id) {
        try {
          await cloudinary.uploader.destroy(question.image.public_id);
        } catch (error) {
          console.error("Failed to delete old image:", error);
        }
      }

      // Use the uploaded file (already processed by multer-storage-cloudinary)
      updates.image = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    } // AFTER - Handle different question types properly
    const allowedUpdates = [
      "question",
      "correctAnswer",
      "explanation",
      "difficulty",
      "isActive",
      "questionType",
      "options",
      "numberOfOptions",
      "image",
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        question[key] = updates[key];
      }
    });

    // Recalculate totalQuestions after update
    course.totalQuestions = course.questions.filter((q) => q.isActive).length;
    await course.save();

    try {
      await questionCacheService.invalidateQuestion(courseId, questionId);
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Cache invalidated for question ${questionId} in course ${courseId}`
        );
      }
    } catch (cacheError) {
      // Log but don't fail the request if cache invalidation fails
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to invalidate question cache:", cacheError);
      }
    }
    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: { question },
    });
  } catch (error) {
    console.error("Update question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
    });
  }
};

// Toggle course status
export const toggleCourseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.status(200).json({
      success: true,
      message: `Course ${course.isActive ? "activated" : "deactivated"} successfully`,
      data: { course },
    });
  } catch (error) {
    console.error("Toggle course status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle course status",
    });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Category name must be at least 2 characters long",
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    const newCategory = new Category({
      name: name.trim(),
      description: description?.trim(),
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: { category: newCategory },
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    // Use aggregation to get categories with course count in single query
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "category",
          as: "courses",
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          isActive: 1,
          createdAt: 1,
          coursesCount: { $size: "$courses" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: { categories },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
    });
  }
};

// Get category by ID with courses
export const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get courses in this category
    const courses = await Course.find({ category: categoryId }).select(
      "name description isActive createdAt"
    );

    res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: {
        category: {
          ...category.toObject(),
          courses: courses,
          coursesCount: courses.length,
        },
      },
    });
  } catch (error) {
    console.error("Get category by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve category",
    });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        name: name.trim(),
        _id: { $ne: categoryId },
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: { category: updatedCategory },
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId || categoryId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has courses
    const coursesInCategory = await Course.countDocuments({
      category: categoryId,
    });
    if (coursesInCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category that has ${coursesInCategory} course(s). Remove courses from this category first.`,
      });
    }

    await Category.findByIdAndDelete(categoryId);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

// Bulk import questions
export const bulkImportQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Questions array is required and cannot be empty",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Validate each question
    const validatedQuestions = [];
    for (const question of questions) {
      // Check if difficulty exists in course
      const difficultyExists = course.difficulties.find(
        (diff) => diff.name === question.difficulty
      );
      if (!difficultyExists) {
        return res.status(400).json({
          success: false,
          message: `Difficulty level '${question.difficulty}' not configured for this course`,
        });
      }

      // Validate required fields
      if (
        !question.question ||
        !question.correctAnswer ||
        !question.explanation
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Question, answer, and explanation are required for all questions",
        });
      }

      validatedQuestions.push({
        difficulty: question.difficulty,
        question: question.question.trim(),
        questionType: question.questionType || "multiple",
        options: question.options || [],
        correctAnswer: question.correctAnswer,
        explanation: question.explanation.trim(),
        createdBy: req.admin?.email || "admin",
      });
    }

    // Add all questions to course
    course.questions.push(...validatedQuestions);
    course.totalQuestions = course.questions.filter((q) => q.isActive).length;
    await course.save();

    res.status(201).json({
      success: true,
      message: `${validatedQuestions.length} questions imported successfully`,
      data: { questions: validatedQuestions },
    });
  } catch (error) {
    console.error("Bulk import questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import questions",
    });
  }
};
