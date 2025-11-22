import User from "../Models/User.js";
import Course from "../Models/Course.js";
import pointsService from "../services/pointsService.js";
import { invalidateCache } from "../Config/redis.js";

// Record DevTools violation
export const recordViolation = async (req, res) => {
  try {
    const { courseId, courseName, detectionMethod } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (!courseId || !detectionMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already banned from this course
    const isBanned = user.bannedCourses.some(
      (ban) => ban.courseId.toString() === courseId && 
               (ban.permanent || (ban.unbanAt && ban.unbanAt > new Date()))
    );

    if (isBanned) {
      return res.status(403).json({
        success: false,
        message: "You are already banned from this course",
        banned: true,
      });
    }

    // Record violation
    user.devToolsViolations.count += 1;
    user.devToolsViolations.lastViolation = new Date();
    user.devToolsViolations.violationDetails.push({
      timestamp: new Date(),
      courseId,
      courseName,
      detectionMethod,
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    // Deduct points
    const pointsDeduction = 5;
    await pointsService.updateUserPoints(
      userId, 
      -pointsDeduction, 
      "devtools_violation"
    );

    // Auto-ban after 3 violations for the same course
    const courseViolations = user.devToolsViolations.violationDetails.filter(
      (v) => v.courseId.toString() === courseId
    );

    if (courseViolations.length >= 3) {
      user.bannedCourses.push({
        courseId,
        courseName,
        bannedAt: new Date(),
        reason: "Multiple DevTools violations detected during test",
        permanent: true,
      });

      await user.save();
      
      // Invalidate user cache
      await invalidateCache.user(userId, user.username);

      return res.status(403).json({
        success: false,
        message: "You have been permanently banned from this course due to repeated violations",
        banned: true,
        violations: courseViolations.length,
        pointsDeducted: pointsDeduction,
      });
    }

    await user.save();
    
    // Invalidate user cache
    await invalidateCache.user(userId, user.username);

    res.status(200).json({
      success: true,
      message: "Violation recorded",
      data: {
        violationCount: courseViolations.length,
        totalViolations: user.devToolsViolations.count,
        pointsDeducted: pointsDeduction,
        warningsRemaining: 3 - courseViolations.length,
      },
    });
  } catch (error) {
    console.error("Record violation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record violation",
    });
  }
};

// Check if user is banned from a course
export const checkCourseBan = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId).select("bannedCourses");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const ban = user.bannedCourses.find(
      (b) => b.courseId.toString() === courseId &&
             (b.permanent || (b.unbanAt && b.unbanAt > new Date()))
    );

    if (ban) {
      return res.status(200).json({
        success: true,
        banned: true,
        data: {
          reason: ban.reason,
          bannedAt: ban.bannedAt,
          permanent: ban.permanent,
          courseName: ban.courseName,
        },
      });
    }

    res.status(200).json({
      success: true,
      banned: false,
    });
  } catch (error) {
    console.error("Check ban error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check ban status",
    });
  }
};

// Admin: Get all users with violations
export const getViolationStats = async (req, res) => {
  try {
    const users = await User.find({
      "devToolsViolations.count": { $gt: 0 },
    })
      .select("name username email devToolsViolations bannedCourses")
      .sort({ "devToolsViolations.count": -1 })
      .limit(100)
      .lean();

    const stats = {
      totalViolators: users.length,
      totalViolations: users.reduce((sum, u) => sum + u.devToolsViolations.count, 0),
      totalBannedUsers: users.filter(u => u.bannedCourses.length > 0).length,
      recentViolations: users
        .filter(u => u.devToolsViolations.lastViolation)
        .slice(0, 10)
        .map(u => ({
          userId: u._id,
          name: u.name,
          username: u.username,
          email: u.email,
          violationCount: u.devToolsViolations.count,
          lastViolation: u.devToolsViolations.lastViolation,
          bannedCoursesCount: u.bannedCourses.length,
        })),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get violation stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get violation statistics",
    });
  }
};

// Admin: Ban/Unban user from course
export const adminBanUser = async (req, res) => {
  try {
    const { userId, courseId, reason, permanent } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "User ID and Course ID are required",
      });
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId).select("name"),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if already banned
    const existingBan = user.bannedCourses.findIndex(
      (b) => b.courseId.toString() === courseId
    );

    if (existingBan !== -1) {
      // Remove existing ban
      user.bannedCourses.splice(existingBan, 1);
    }

    // Add new ban
    user.bannedCourses.push({
      courseId,
      courseName: course.name,
      bannedAt: new Date(),
      bannedBy: req.admin.userId,
      reason: reason || "Admin ban",
      permanent: permanent !== false,
    });

    await user.save();
    
    // Invalidate user cache
    await invalidateCache.user(userId, user.username);

    res.status(200).json({
      success: true,
      message: `User ${permanent !== false ? 'permanently banned' : 'banned'} from ${course.name}`,
    });
  } catch (error) {
    console.error("Admin ban user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ban user",
    });
  }
};

// Admin: Unban user from course
export const adminUnbanUser = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const banIndex = user.bannedCourses.findIndex(
      (b) => b.courseId.toString() === courseId
    );

    if (banIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Ban not found",
      });
    }

    const courseName = user.bannedCourses[banIndex].courseName;
    user.bannedCourses.splice(banIndex, 1);

    await user.save();
    
    // Invalidate user cache
    await invalidateCache.user(userId, user.username);

    res.status(200).json({
      success: true,
      message: `User unbanned from ${courseName}`,
    });
  } catch (error) {
    console.error("Admin unban user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unban user",
    });
  }
};