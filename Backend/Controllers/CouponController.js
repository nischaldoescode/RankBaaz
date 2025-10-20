import Coupon from "../Models/Coupon.js";
import Course from "../Models/Course.js";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import DOMPurify from "isomorphic-dompurify";
import redisClient from "../Config/redis.js";

// Validation rules for coupon creation
export const couponValidation = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 4, max: 20 })
    .withMessage("Coupon code must be between 4 and 20 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Coupon code must contain only uppercase letters and numbers")
    .customSanitizer((value) => value.toUpperCase()),

  body("type")
    .isIn(["course", "universal"])
    .withMessage("Type must be either 'course' or 'universal'"),

  body("discount")
    .isIn([2, 5, 10, 15, 20])
    .withMessage("Discount must be 2%, 5%, 10%, 15%, or 20%"),

  body("course").custom((value, { req }) => {
    if (req.body.type === "course" && !value) {
      throw new Error("Course ID is required for course-level coupons");
    }
    return true;
  }),

  body("maxUsage")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max usage must be a positive number"),

  body("validUntil")
    .optional()
    .isISO8601()
    .withMessage("Valid until must be a valid date"),
];

// Validation rules for coupon update
export const couponUpdateValidation = [
  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Coupon code cannot be empty")
    .isLength({ min: 4, max: 20 })
    .withMessage("Coupon code must be between 4 and 20 characters")
    .matches(/^[A-Z0-9]+$/)
    .withMessage("Coupon code must contain only uppercase letters and numbers")
    .customSanitizer((value) => value.toUpperCase()),

  body("discount")
    .optional()
    .isIn([2, 5, 10, 15, 20])
    .withMessage("Discount must be 2%, 5%, 10%, 15%, or 20%"),

  body("maxUsage")
    .optional()
    .custom((value) => {
      // Allow null, empty string, or valid positive integer
      if (value === null || value === "" || value === undefined) {
        return true;
      }
      const parsed = parseInt(value);
      if (isNaN(parsed) || parsed < 1) {
        throw new Error(
          "Max usage must be a positive number or leave empty for unlimited"
        );
      }
      return true;
    }),

  body("validUntil")
    .optional()
    .custom((value) => {
      // Allow null, empty string, or valid future date
      if (value === null || value === "" || value === undefined) {
        return true;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error("Valid until must be a valid date");
      }
      if (date < new Date()) {
        throw new Error("Valid until must be in the future");
      }
      return true;
    }),
];

// Helper function to clear multiple coupon caches
const clearCouponCache = async (couponCodes) => {
  if (!Array.isArray(couponCodes) || couponCodes.length === 0) {
    return;
  }

  try {
    const cacheKeys = couponCodes.map((code) => `coupon:${code.toUpperCase()}`);
    await redisClient.del(...cacheKeys);
    console.log(`[CACHE] Cleared cache for ${cacheKeys.length} coupons`);
  } catch (error) {
    console.error("[CACHE] Bulk cache clear failed:", error);
  }
};

// Create coupon
export const createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { code, type, course, discount, maxUsage, validUntil } = req.body;

    const sanitizedCode = DOMPurify.sanitize(code.trim().toUpperCase());
    // Check if coupon code already exists
    const hashedCode = crypto
      .createHash("sha256")
      .update(sanitizedCode)
      .digest("hex");

    // Check if coupon code already exists (using hashed code)
    const existingCoupon = await Coupon.findOne({
      hashedCode: hashedCode, // Use hashed code for lookup
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // If course-level coupon, verify course exists and is paid
    if (type === "course") {
      const courseDoc = await Course.findById(course);
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
      if (!courseDoc.isPaid) {
        return res.status(400).json({
          success: false,
          message: "Coupons can only be created for paid courses",
        });
      }
    }

    // Create coupon
    const coupon = new Coupon({
      code: sanitizedCode,
      hashedCode: hashedCode,
      type,
      course: type === "course" ? course : null,
      discount,
      maxUsage: maxUsage || null,
      validUntil: validUntil || null,
      createdBy: req.admin?.email || req.user?.email || "admin",
    });

    await coupon.save();

    // Populate course details if course-level coupon
    await coupon.populate("course", "name isPaid price");

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          course: coupon.course,
          discount: coupon.discount,
          isActive: coupon.isActive,
          usageCount: coupon.usageCount,
          maxUsage: coupon.maxUsage,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          createdAt: coupon.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
    });
  }
};

// Get all coupons (for admin)
export const getAllCoupons = async (req, res) => {
  try {
    const { type, isActive, courseId } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (courseId) filter.course = courseId;

    const coupons = await Coupon.find(filter)
      .populate("course", "name isPaid price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        coupons: coupons.map((coupon) => ({
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          course: coupon.course,
          discount: coupon.discount,
          isActive: coupon.isActive,
          usageCount: coupon.usageCount,
          maxUsage: coupon.maxUsage,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve coupons",
    });
  }
};

// Update coupon details
export const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { code, discount, maxUsage, validUntil } = req.body;

    // Find existing coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const cacheKey = `coupon:${coupon.code.toUpperCase()}`;
    try {
      await redisClient.del(cacheKey);
      console.log(`[CACHE] Cleared cache for coupon: ${coupon.code}`);
    } catch (cacheError) {
      console.error("[CACHE] Failed to clear coupon cache:", cacheError);
      // Don't fail the request if cache clear fails
    }

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== coupon.code) {
      const sanitizedCode = DOMPurify.sanitize(code.trim().toUpperCase());

      // Generate new hashed code
      const newHashedCode = crypto
        .createHash("sha256")
        .update(sanitizedCode)
        .digest("hex");

      // Check if new code already exists
      const existingCoupon = await Coupon.findOne({
        hashedCode: newHashedCode,
        _id: { $ne: couponId }, // Exclude current coupon
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists",
        });
      }

      // Update code and hashedCode
      coupon.code = sanitizedCode;
      coupon.hashedCode = newHashedCode;
    }

    // Update other fields if provided
    if (discount !== undefined) {
      // Validate discount is in allowed values
      if (![2, 5, 10, 15, 20].includes(parseInt(discount))) {
        return res.status(400).json({
          success: false,
          message: "Discount must be 2%, 5%, 10%, 15%, or 20%",
        });
      }
      coupon.discount = parseInt(discount);
    }

    if (maxUsage !== undefined) {
      // If maxUsage is empty string or null, set to null (unlimited)
      if (maxUsage === "" || maxUsage === null) {
        coupon.maxUsage = null;
      } else {
        const parsedMaxUsage = parseInt(maxUsage);
        if (parsedMaxUsage < 1) {
          return res.status(400).json({
            success: false,
            message:
              "Max usage must be at least 1 or leave empty for unlimited",
          });
        }
        // Check if new maxUsage is less than current usage
        if (parsedMaxUsage < coupon.usageCount) {
          return res.status(400).json({
            success: false,
            message: `Max usage cannot be less than current usage (${coupon.usageCount})`,
          });
        }
        coupon.maxUsage = parsedMaxUsage;
      }
    }

    if (validUntil !== undefined) {
      // If validUntil is empty string or null, set to null (no expiry)
      if (validUntil === "" || validUntil === null) {
        coupon.validUntil = null;
      } else {
        const expiryDate = new Date(validUntil);
        if (expiryDate < new Date()) {
          return res.status(400).json({
            success: false,
            message: "Expiry date must be in the future",
          });
        }
        coupon.validUntil = expiryDate;
      }
    }

    await coupon.save();

    // Populate course details if course-level coupon
    await coupon.populate("course", "name isPaid price");

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          course: coupon.course,
          discount: coupon.discount,
          isActive: coupon.isActive,
          usageCount: coupon.usageCount,
          maxUsage: coupon.maxUsage,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update coupon",
    });
  }
};

// Get coupons for a specific course (for admin)
export const getCourseCoupons = async (req, res) => {
  try {
    const { courseId } = req.params;

    const coupons = await Coupon.find({
      course: courseId,
      type: "course",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        coupons: coupons.map((coupon) => ({
          _id: coupon._id,
          code: coupon.code,
          discount: coupon.discount,
          isActive: coupon.isActive,
          usageCount: coupon.usageCount,
          maxUsage: coupon.maxUsage,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          createdAt: coupon.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get course coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve course coupons",
    });
  }
};

// Verify coupon (for users during checkout)
export const verifyCoupon = async (req, res) => {
  try {
    const { code, courseId } = req.body;
    const userId = req.user?.userId;

    // ADD CACHE CHECK
    const cacheKey = `coupon:${code}:${courseId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const cachedData = JSON.parse(cached);
      // Still need to check user-specific validations
      const coupon = await Coupon.findById(cachedData.couponId);
      if (coupon) {
        const validationResult = coupon.isValid(userId);
        if (validationResult.valid) {
          return res.status(200).json({
            success: true,
            message: "Coupon applied successfully",
            data: cachedData,
          });
        }
      }
    }

    // Hash the input code to search
    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toUpperCase())
      .digest("hex");

    // Find coupon by hashed code
    const coupon = await Coupon.findOne({ hashedCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // Check if coupon is valid
    const validationResult = coupon.isValid(userId);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: validationResult.reason,
      });
    }

    // Check if coupon applies to this course
    if (coupon.type === "course") {
      if (coupon.course.toString() !== courseId) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not valid for this course",
        });
      }
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course || !course.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or course is not paid",
      });
    }

    // Calculate discount
    const originalPrice = course.price;
    const discountAmount = Math.round((originalPrice * coupon.discount) / 100);
    const finalPrice = originalPrice - discountAmount;

    // ADD TO CACHE (5 minutes)
    await redisClient.setex(
      cacheKey,
      300,
      JSON.stringify({
        discount: coupon.discount,
        originalPrice,
        discountAmount,
        finalPrice,
        couponId: coupon._id,
      })
    );

    // Return discount info (WITHOUT revealing the actual coupon code or hash)
    res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        discount: coupon.discount,
        originalPrice,
        discountAmount,
        finalPrice,
        couponId: coupon._id,
      },
    });
  } catch (error) {
    console.error("Verify coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify coupon",
    });
  }
};

// Update coupon status
export const updateCouponStatus = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { isActive } = req.body;

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { isActive },
      { new: true }
    ).populate("course", "name");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Coupon ${isActive ? "activated" : "deactivated"} successfully`,
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          isActive: coupon.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Update coupon status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update coupon status",
    });
  }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    const coupon = await Coupon.findByIdAndDelete(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const cacheKey = `coupon:${coupon.code.toUpperCase()}`;
    try {
      await redisClient.del(cacheKey);
      console.log(`[CACHE] Cleared cache for deleted coupon: ${coupon.code}`);
    } catch (cacheError) {
      console.error("[CACHE] Failed to clear coupon cache:", cacheError);
      // Don't fail the request if cache clear fails
    }

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
    });
  }
};
