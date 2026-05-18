import jwt from "jsonwebtoken";
import Teacher from "../Models/Teacher.js";
import redisClient from "../Config/redis.js";

/**
 * authenticate teacher via jwt cookie
 * also checks accessBlocked status from cache or db
 */
export const authenticateTeacher = async (req, res, next) => {
  try {
    const token = req.cookies.teacherToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Teacher authentication required",
        code: "TEACHER_AUTH_REQUIRED",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET,
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired",
          code: "TEACHER_TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // try cache first
    const cacheKey = `teacher:${decoded.teacherId}`;
    let teacherData = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        teacherData = JSON.parse(cached);
      }
    } catch {}

    if (!teacherData) {
      const teacher = await Teacher.findById(decoded.teacherId)
        .select("-password -otp")
        .lean();

      if (!teacher || !teacher.isActive) {
        return res.status(401).json({
          success: false,
          message: "Invalid session",
        });
      }

      teacherData = teacher;

      try {
        await redisClient.setex(cacheKey, 300, JSON.stringify(teacherData));
      } catch {}
    }

    req.teacher = {
      teacherId: teacherData._id,
      ...teacherData,
    };

    next();
  } catch (error) {
    console.error("Teacher auth error:", error);
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
};

/**
 * Block teacher-only features until documents are verified.
 * Profile + document upload routes stay open so the teacher can fix verification.
 */
export const requireDocumentVerification = (req, res, next) => {
  const teacher = req.teacher;

  if (!teacher) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const documentStatus = teacher.documentStatus || "not_uploaded";
  const isRestricted = teacher.accessBlocked || documentStatus !== "verified";

  if (isRestricted) {
    const message =
      teacher.documentRequestNote ||
      teacher.accessBlockReason ||
      (documentStatus === "pending"
        ? "Your documents are under review. Full teacher tools unlock after verification."
        : "Please upload verification documents before using teacher tools.");

    return res.status(403).json({
      success: false,
      code: "ACCESS_BLOCKED",
      reason: teacher.accessBlocked ? "blocked" : "verification_required",
      message,
      data: {
        documentStatus,
        documentRequested: teacher.documentRequested,
        documentRequestNote: teacher.documentRequestNote,
      },
    });
  }

  next();
};
