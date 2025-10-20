
import Payment from "../Models/Payment.js";
import Course from "../Models/Course.js";

// Middleware to check course access
export const checkCourseAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // If course is free, allow access
    if (!course.isPaid) {
      return next();
    }

    // Check if user has purchased
    const payment = await Payment.findOne({
      user: userId,
      course: courseId,
      status: "success",
    });

    if (!payment) {
      return res.status(403).json({
        success: false,
        message: "Please purchase this course to access it",
        requiresPayment: true,
        coursePrice: course.price,
        courseName: course.name,
      });
    }

    next();
  } catch (error) {
    console.error("Course access check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify course access",
    });
  }
};