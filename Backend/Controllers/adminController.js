import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import Admin from "../Models/Admin.js";
import User from "../Models/User.js";
import TestResult from "../Models/TestResult.js";

// Validation rules (same as before)

export const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2-50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("age")
    .isInt({ min: 18, max: 100 })
    .withMessage("Age must be between 18-100"),
  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2-50 characters"),
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("age")
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage("Age must be between 10-100"),
  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// Simple admin token generation (no IP/User-Agent)
const generateAdminToken = (userId) => {
  return jwt.sign({ userId, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateAdminRefreshToken = (userId) => {
  return jwt.sign({ userId, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const adminRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    // 🔐 Block registration if any admin already exists
    const adminExists = await Admin.exists({});
    if (adminExists) {
      return res.status(403).json({
        success: false,
        message: "Admin already exists. Registration is disabled.",
      });
    }

    const { name, email, password, age, gender } = req.body;

    // Email duplication check
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          age: admin.age,
          gender: admin.gender,
          role: admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          lastLogin: admin.lastLoginAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({
      success: false,
      message: "Admin registration failed",
    });
  }
};

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or insufficient permissions",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate simple admin tokens
    const token = generateAdminToken(admin._id);
    const refreshToken = generateAdminRefreshToken(admin._id);

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("adminRefreshToken", refreshToken, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          age: admin.age,
          gender: admin.gender,
          role: admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          lastLogin: admin.lastLoginAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
};

// Admin Get Profile
export const adminGetProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.userId).select("-password");

    res.status(200).json({
      success: true,
      message: "Admin profile retrieved successfully",
      data: { admin },
    });
  } catch (error) {
    console.error("Admin get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve admin profile",
    });
  }
};

// Admin Update Profile
export const adminUpdateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const userId = req.admin.userId;
    const currentAdmin = await Admin.findById(userId).select("email");
    // Check email uniqueness
    if (req.body.email && req.body.email !== currentAdmin.email) {
      const existingAdmin = await Admin.findOne({
        email: req.body.email,
        _id: { $ne: userId },
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken",
        });
      }
    }

    const updates = {};
    ["name", "age", "gender", "email"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const admin = await Admin.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      data: {
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          age: admin.age,
          gender: admin.gender,
          role: admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
          lastLogin: admin.lastLoginAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admin profile",
    });
  }
};

// Admin Change Password
export const adminChangePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.admin.userId;

    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedNewPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin password changed successfully",
    });
  } catch (error) {
    console.error("Admin change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change admin password",
    });
  }
};

// Admin Logout
export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminToken");
    res.clearCookie("adminRefreshToken");

    res.status(200).json({
      success: true,
      message: "Admin logout successful",
    });
  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({
      success: false,
      message: "Admin logout failed",
    });
  }
};

export const admincheckExists = async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    res.json({ exists: adminCount > 0 });
  } catch (error) {
    res.status(500).json({ exists: false });
  }
};

// Get all registered users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "createdAt"; // createdAt, name, email
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const [users, totalUsers] = await Promise.all([
      User.find({})
        .select(
          "name email username dateOfBirth gender createdAt stats points badges"
        )
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments({}),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    // Calculate age from dateOfBirth
    const usersWithAge = users.map((user) => ({
      ...user,
      age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithAge,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
    });
  }
};

// Search users by name, email, or username
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const searchRegex = new RegExp(query.trim(), "i");

    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
      ],
    })
      .select(
        "name email username dateOfBirth gender createdAt stats points badges"
      )
      .limit(50)
      .lean();

    const usersWithAge = users.map((user) => ({
      ...user,
      age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithAge,
        count: usersWithAge.length,
      },
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};

// Get detailed user information
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, testHistory] = await Promise.all([
      User.findById(userId).select("-password").lean(),

      TestResult.find({ user: userId })
        .populate("course", "name image") // Add image to populate
        .sort({ completedAt: -1, createdAt: -1 }) // Sort by completedAt first
        .limit(10)
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Enhance test history with better data
    const enhancedTestHistory = testHistory.map((test) => ({
      ...test,
      courseName: test.course?.name || "Unknown Course",
      courseImage: test.course?.image?.url || null,
      percentage: test.percentage || 0,
      completedAt: test.completedAt || test.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          age: user.dateOfBirth ? calculateAge(user.dateOfBirth) : null,
        },
        recentTests: enhancedTestHistory,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user details",
    });
  }
};

// Helper function to calculate age
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Export user statistics to CSV
export const exportUsersToCSV = async (req, res) => {
  try {
    const users = await User.find({})
      .select(
        "name email username dateOfBirth gender createdAt stats points badges"
      )
      .lean();

    // CSV Headers
    const headers = [
      "Name",
      "Email",
      "Username",
      "Age",
      "Gender",
      "Registration Date",
      "Tests Completed",
      "Questions Answered",
      "Total Points",
      "Badges Earned",
    ];

    // CSV Rows
    const rows = users.map((user) => {
      const age = user.dateOfBirth ? calculateAge(user.dateOfBirth) : "N/A";
      const regDate = new Date(user.createdAt).toLocaleDateString("en-US");

      return [
        user.name || "",
        user.email || "",
        user.username || "",
        age,
        user.gender || "N/A",
        regDate,
        user.stats?.testsCompleted || 0,
        user.stats?.questionsAnswered || 0,
        user.points || 0,
        user.badges?.length || 0,
      ];
    });

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Set headers for file download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users-export-${Date.now()}.csv"`
    );
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");

    // Send CSV
    res.status(200).send("\uFEFF" + csvContent); // Add BOM for Excel compatibility
  } catch (error) {
    console.error("Export users to CSV error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export users to CSV",
    });
  }
};
