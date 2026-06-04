/**
 * keeps the coupon controller controller focused and readable.
 */
import Coupon from "../Models/Coupon.js";
import Course from "../Models/Course.js";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import DOMPurify from "isomorphic-dompurify";
import redisClient from "../Config/redis.js";

// validation rules for coupon creation
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

// validation rules for coupon update
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
      // allow null, empty string, or valid positive integer
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
      // allow null, empty string, or valid future date
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

// helper function to clear multiple coupon caches
const clearCouponCache = async (couponCodes) => {
  if (!Array.isArray(couponCodes) || couponCodes.length === 0) {
    return;
  }

  try {
    const cacheKeys = couponCodes.map((code) => `coupon:${code.toUpperCase()}`);
    await redisClient.del(...cacheKeys);
    console.log(`Cleared cache for ${cacheKeys.length} coupons`);
  } catch (error) {
    console.error("Bulk cache clear failed:", error);
  }
};

// create coupon
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
    // check if coupon code already exists
    const hashedCode = crypto
      .createHash("sha256")
      .update(sanitizedCode)
      .digest("hex");

    // check if coupon code already exists (using hashed code)
    const existingCoupon = await Coupon.findOne({
      hashedCode: hashedCode, // use hashed code for lookup
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    // if course-level coupon, verify course exists and is paid
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

    // create coupon
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

    // populate course details if course-level coupon
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

// get all coupons (for admin)
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

// update coupon details
export const updateCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { code, discount, maxUsage, validUntil } = req.body;

    // find existing coupon
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
      console.log(`Cleared cache for coupon: ${coupon.code}`);
    } catch (cacheError) {
      console.error("Failed to clear coupon cache:", cacheError);
      // don't fail the request if cache clear fails
    }

    // if code is being d, check for duplicates
    if (code && code.toUpperCase() !== coupon.code) {
      const sanitizedCode = DOMPurify.sanitize(code.trim().toUpperCase());

      // generate hashed code
      const newHashedCode = crypto
        .createHash("sha256")
        .update(sanitizedCode)
        .digest("hex");

      // check if code already exists
      const existingCoupon = await Coupon.findOne({
        hashedCode: newHashedCode,
        _id: { $ne: couponId }, // exclude current coupon
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists",
        });
      }

      // update code and hashedcode
      coupon.code = sanitizedCode;
      coupon.hashedCode = newHashedCode;
    }

    // update other fields if provided
    if (discount !== undefined) {
      // validate discount is in allowed values
      if (![2, 5, 10, 15, 20].includes(parseInt(discount))) {
        return res.status(400).json({
          success: false,
          message: "Discount must be 2%, 5%, 10%, 15%, or 20%",
        });
      }
      coupon.discount = parseInt(discount);
    }

    if (maxUsage !== undefined) {
      // if maxusage is empty string or null, set to null (unlimited)
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
        // check if maxusage is less than current usage
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
      // if validuntil is empty string or null, set to null (no expiry)
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

    // populate course details if course-level coupon
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

// get coupons for a specific course (for admin)
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

// verify coupon (for users during checkout)
export const verifyCoupon = async (req, res) => {
  try {
    const { code, courseId } = req.body;
    const userId = req.user?.userId;

    // cache check
    const cacheKey = `coupon:${code}:${courseId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const cachedData = JSON.parse(cached);
      // still need to check user-specific validations
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

    // hash the input code to search
    const hashedCode = crypto
      .createHash("sha256")
      .update(code.toUpperCase())
      .digest("hex");

    // find coupon by hashed code
    const coupon = await Coupon.findOne({ hashedCode });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // check if coupon is valid
    const validationResult = coupon.isValid(userId);
    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: validationResult.reason,
      });
    }

    // check if coupon applies to this course
    if (coupon.type === "course") {
      if (coupon.course.toString() !== courseId) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not valid for this course",
        });
      }
    }

    // get course details
    const course = await Course.findById(courseId);
    if (!course || !course.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Invalid course or course is not paid",
      });
    }

    // calculate discount
    const originalPrice = course.price;
    const discountAmount = Math.round((originalPrice * coupon.discount) / 100);
    const finalPrice = originalPrice - discountAmount;

    // to cache (5 minutes)
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

    // return discount info (without revealing the actual coupon code or hash)
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

// update coupon status
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

// delete coupon
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
      console.log(`Cleared cache for deleted coupon: ${coupon.code}`);
    } catch (cacheError) {
      console.error("Failed to clear coupon cache:", cacheError);
      // don't fail the request if cache clear fails
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


// teacher coupon management

/**
 * lets a teacher create a coupon when admin has granted access.
 * and teacher owns the course
 */
export const teacherCreateCoupon = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId, discount, maxUsage, validUntil, code } = req.body;

    if (!code || !courseId || !discount) {
      return res.status(400).json({
        success: false,
        message: "Code, courseId, and discount are required",
      });
    }

    // validate code format
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanCode.length < 4 || cleanCode.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be 4-20 uppercase letters/numbers",
      });
    }

    if (![2, 5, 10, 15, 20].includes(parseInt(discount))) {
      return res.status(400).json({
        success: false,
        message: "Discount must be 2, 5, 10, 15, or 20 percent",
      });
    }

    // verify teacher owns course and course is approved
    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
      approvalStatus: "approved",
      isPaid: true,
    });

    if (!course) {
      return res.status(403).json({
        success: false,
        message: "Course not found, not approved, or not owned by you",
      });
    }

    // security: check if admin granted coupon access for this teacher
    const Teacher = (await import("../Models/Teacher.js")).default;
    const teacher = await Teacher.findById(teacherId).select("couponAccess accessBlocked");

    if (!teacher || teacher.accessBlocked) {
      return res.status(403).json({ success: false, message: "Account restricted" });
    }

    if (!teacher.couponAccess) {
      return res.status(403).json({
        success: false,
        code: "COUPON_ACCESS_DENIED",
        message: "You don't have permission to create coupons. Contact admin.",
      });
    }

    // check duplicate
    const hashedCode = crypto.createHash("sha256").update(cleanCode).digest("hex");
    const existing = await Coupon.findOne({ hashedCode });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      hashedCode,
      type: "course",
      course: courseId,
      discount: parseInt(discount),
      maxUsage: maxUsage ? parseInt(maxUsage) : null,
      validUntil: validUntil || null,
      createdBy: req.teacher.username || "teacher",
      createdByTeacher: teacherId,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created",
      data: {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discount: coupon.discount,
          maxUsage: coupon.maxUsage,
          validUntil: coupon.validUntil,
          isActive: coupon.isActive,
          usageCount: coupon.usageCount,
          createdAt: coupon.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Teacher create coupon error:", error);
    res.status(500).json({ success: false, message: "Failed to create coupon" });
  }
};

export const teacherGetCourseCoupons = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId } = req.params;

    // verify teacher owns course
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const coupons = await Coupon.find({ course: courseId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        coupons: coupons.map((c) => ({
          _id: c._id,
          code: c.code,
          discount: c.discount,
          isActive: c.isActive,
          usageCount: c.usageCount,
          maxUsage: c.maxUsage,
          validUntil: c.validUntil,
          createdAt: c.createdAt,
          createdBy: c.createdBy,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch coupons" });
  }
};

export const teacherDeleteCoupon = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { couponId } = req.params;

    const coupon = await Coupon.findById(couponId).populate("course");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    // security: teacher can only delete their own course's coupons
    const courseTeacher = coupon.course?.teacher?.toString();
    if (courseTeacher !== teacherId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Coupon.findByIdAndDelete(couponId);

    try {
      await redisClient.del(`coupon:${coupon.code.toUpperCase()}`);
    } catch {}

    return res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
};

export const teacherToggleCouponStatus = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { couponId } = req.params;
    const { isActive } = req.body;

    const coupon = await Coupon.findById(couponId).populate("course");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (coupon.course?.teacher?.toString() !== teacherId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    coupon.isActive = isActive;
    await coupon.save();

    try {
      await redisClient.del(`coupon:${coupon.code.toUpperCase()}`);
    } catch {}

    return res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed" });
  }
};

/**
 * admin grants/revokes coupon creation access to a teacher
 */
export const adminSetTeacherCouponAccess = async (req, res) => {
  try {
    const { teacherId, access } = req.body;

    const Teacher = (await import("../Models/Teacher.js")).default;
    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { couponAccess: !!access },
      { new: true }
    ).select("name email username couponAccess");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Coupon access ${access ? "granted" : "revoked"}`,
      data: { teacher },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed" });
  }
};
