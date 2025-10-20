import User from "../Models/User.js";
import TestResult from "../Models/TestResult.js";
import pointsService from "../services/pointsService.js";
import badgeService from "../services/badgeService.js";
import redisClient from "../Config/redis.js";

export const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const requestingUserId = req.user?.userId;

    // Check Redis cache first
    const cacheKey = `profile:${username}`;
    const cached = await redisClient.get(cacheKey);

    if (cached && (!requestingUserId || cached.userId !== requestingUserId)) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cached),
      });
    }

    // Fetch from database
    // Fetch from database
    const user = await User.findOne({ username: username.toLowerCase() })
      .select("username name nameVisibility points badges stats createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `There is no profile named @${username}`,
      });
    }

    // Get test statistics
    const testStats = await TestResult.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          totalPointsEarned: { $sum: "$pointsEarned" },
          averagePercentage: { $avg: "$percentage" },
          bestPercentage: { $max: "$percentage" },
          totalQuestionsAnswered: { $sum: "$totalQuestions" },
        },
      },
    ]);

    const stats = testStats[0] || {
      totalTests: 0,
      totalPointsEarned: 0,
      averagePercentage: 0,
      bestPercentage: 0,
      totalQuestionsAnswered: 0,
    };

    // Get recent tests with course details
    const recentTests = await TestResult.find({ user: user._id })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate("course", "name")
      .select("course difficulty percentage completedAt pointsEarned")
      .lean();

    // Get global rank
    const rank = await pointsService.getUserRank(user._id);

    // Format badges with descriptions
    const formattedBadges = user.badges.map((badge) => ({
      ...badge,
      ...badgeService.getBadgeInfo(badge.type),
    }));

    const isOwnProfile =
      requestingUserId && user._id.toString() === requestingUserId;

    const profileData = {
      username: user.username,
      // Only show name if it's public OR if viewing own profile
      name: user.nameVisibility === "public" || isOwnProfile ? user.name : null,
      nameVisibility: user.nameVisibility,
      points: user.points,
      rank,
      badges: formattedBadges,
      stats: {
        testsCompleted: user.stats.testsCompleted,
        questionsAnswered: user.stats.questionsAnswered,
        averagePercentile: user.stats.averagePercentile,
        leaderboardDaysOnTop: user.stats.leaderboardDaysOnTop,
        memberSince: user.createdAt,
        totalPointsEarned: stats.totalPointsEarned,
        averagePercentage: Math.round(stats.averagePercentage),
        bestPercentage: stats.bestPercentage,
      },
      recentActivity: recentTests.map((test) => ({
        courseId: test.course._id,
        courseName: test.course.name,
        difficulty: test.difficulty,
        percentage: test.percentage,
        pointsEarned: test.pointsEarned,
        completedAt: test.completedAt,
      })),
      isOwnProfile,
    };

    // Cache for 5 minutes (shorter cache for dynamic data)
    await redisClient.setex(cacheKey, 300, JSON.stringify(profileData));

    res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Get public profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password -otp").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        settingsAvailable: [
          "name",
          "dateOfBirth",
          "gender",
          "email",
          "password",
        ],
      },
    });
  } catch (error) {
    console.error("Get user settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load settings",
    });
  }
};

export const getGlobalLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const leaderboard = await pointsService.getGlobalLeaderboard(limit);

    res.status(200).json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length,
      },
    });
  } catch (error) {
    console.error("Get global leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load leaderboard",
    });
  }
};

export const getUserLeaderboardPosition = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .select("username points stats")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has completed any tests
    if (!user.stats || user.stats.testsCompleted === 0) {
      return res.status(200).json({
        success: true,
        data: {
          rank: null,
          username: user.username,
          points: user.points || 0,
          message: "Complete tests to earn a rank",
          rankChange: null,
        },
      });
    }

    const rank = await pointsService.getUserRank(userId);

    // Calculate rank change
    let rankChange = null;
    if (user.stats.lastKnownRank && rank) {
      rankChange = user.stats.lastKnownRank - rank;
    }

    res.status(200).json({
      success: true,
      data: {
        rank,
        username: user.username,
        points: user.points,
        rankChange,
        lastUpdated: user.stats.rankLastUpdated,
      },
    });
  } catch (error) {
    console.error("Get user position error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get leaderboard position",
    });
  }
};

export const searchUsernames = async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // Check cache first
    const cacheKey = `search:${query.toLowerCase()}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cached),
      });
    }

    // Search database with regex (case-insensitive prefix match)
    const users = await User.find({
      username: { $regex: `^${query.toLowerCase()}`, $options: "i" },
    })
      .select("username name points badges")
      .limit(parseInt(limit))
      .lean();

    const results = users.map((user) => ({
      username: user.username,
      name: user.name,
      points: user.points,
      badgeCount: user.badges.length,
    }));

    // Cache for 10 minutes
    await redisClient.setex(cacheKey, 600, JSON.stringify(results));

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Username search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};
