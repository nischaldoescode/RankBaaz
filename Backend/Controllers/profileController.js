/**
 * handles profile controller api requests, input validation, persistence calls, side effects, and response shaping
 *
 * @file backend/controllers/profilecontroller.js
 * @module backend/controllers/profilecontroller
 * @exports request handlers used by backend routes
 */

import User from "../Models/User.js";
import TestResult from "../Models/TestResult.js";
import pointsService from "../services/pointsService.js";
import badgeService from "../services/badgeService.js";
import redisClient from "../Config/redis.js";

const readCachedPublicProfile = async (cacheKey) => {
  try {
    const cached = await redisClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Public profile cache read skipped:", error.message);
    return null;
  }
};

const writeCachedPublicProfile = async (cacheKey, profile) => {
  try {
    await redisClient.setex(cacheKey, 300, JSON.stringify(profile));
  } catch (error) {
    console.warn("Public profile cache write skipped:", error.message);
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    const requestingUserId = req.user?.userId;
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    const cacheKey = `profile:${username}`;
    const cached = await readCachedPublicProfile(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: {
          ...cached,
          isOwnProfile:
            Boolean(requestingUserId) &&
            String(cached.userId) === String(requestingUserId),
          userId: undefined,
        },
      });
    }

    const user = await User.findOne({
      username,
      isVerified: true,
    })
      .select("username name nameVisibility points badges stats createdAt")
      .lean();

    if (!user) {
      try {
        await redisClient.del(cacheKey);
      } catch {}
      return res.status(404).json({
        success: false,
        message: `There is no profile named @${username}`,
      });
    }

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

    const recentTests = await TestResult.find({
      user: user._id,
      wasAbandoned: { $ne: true },
    })
      .sort({ completedAt: -1 })
      .limit(10)
      .populate("course", "name")
      .select("course difficulty percentage completedAt pointsEarned")
      .lean();

    const rank = await pointsService.getUserRank(user._id);

    const formattedBadges = (user.badges || []).map((badge) => ({
      ...badge,
      ...badgeService.getBadgeInfo(badge.type),
    }));

    const isOwnProfile =
      requestingUserId && user._id.toString() === requestingUserId;

    const publicProfile = {
      userId: String(user._id),
      username: user.username,
      name: user.nameVisibility === "public" ? user.name : null,
      nameVisibility: user.nameVisibility,
      points: Math.max(0, user.points || 0),
      rank,
      badges: formattedBadges,
      stats: {
        testsCompleted: Math.max(0, user.stats?.testsCompleted || 0),
        questionsAnswered: Math.max(0, user.stats?.questionsAnswered || 0),
        averagePercentile: Math.max(0, user.stats?.averagePercentile || 0),
        leaderboardDaysOnTop: Math.max(
          0,
          user.stats?.leaderboardDaysOnTop || 0,
        ),
        memberSince: user.createdAt,
        totalPointsEarned: Math.max(0, stats.totalPointsEarned || 0),
        averagePercentage: Math.max(
          0,
          Math.min(100, Math.round(stats.averagePercentage || 0)),
        ),
        bestPercentage: Math.max(0, Math.min(100, stats.bestPercentage || 0)),
      },
      recentActivity: recentTests
        .filter((test) => test.course?._id && test.course?.name)
        .map((test) => ({
          courseId: test.course._id,
          courseName: test.course.name,
          difficulty: test.difficulty,
          percentage: Math.max(0, Math.min(100, test.percentage || 0)),
          pointsEarned: test.pointsEarned || 0,
          completedAt: test.completedAt,
        })),
    };

    await writeCachedPublicProfile(cacheKey, publicProfile);

    res.status(200).json({
      success: true,
      data: {
        ...publicProfile,
        userId: undefined,
        isOwnProfile,
      },
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

    // check if user has completed any tests
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

    // calculate rank
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

    // check cache first
    const cacheKey = `search:${query.toLowerCase()}:${limit}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cached),
      });
    }

    // search database with regex (case-insensitive prefix match)
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

    // cache for 10 minutes
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
