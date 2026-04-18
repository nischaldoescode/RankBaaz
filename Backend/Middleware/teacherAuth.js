import jwt from "jsonwebtoken";
import Teacher from "../Models/Teacher.js";

/**
 * authenticate teacher via jwt cookie
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

    const decoded = jwt.verify(
      token,
      process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET
    );

    const teacher = await Teacher.findById(decoded.teacherId)
      .select("-password -otp")
      .lean();

    if (!teacher || !teacher.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher session",
      });
    }

    req.teacher = { teacherId: teacher._id, ...teacher };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        code: "TEACHER_TOKEN_EXPIRED",
      });
    }
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};