import redisClient from "../Config/redis.js";
import TestResult from "../Models/TestResult.js";
import User from "../Models/User.js";
import mongoose from "mongoose";

class LeaderboardService {
  getLeaderboardKey(courseId, difficulty = "all") {
    return `leaderboard:${courseId}:${difficulty}`;
  }

  // Course-specific leaderboard (best performance in a course)
  async getLeaderboard(courseId, difficulty = "all", limit = 100, offset = 0) {
    try {
      const key = this.getLeaderboardKey(courseId, difficulty);
      const exists = await redisClient.exists(key);

      if (exists) {
        const userIds = await redisClient.zrevrange(
          key,
          offset, // Start from offset
          offset + limit - 1, // End at offset + limit
          "WITHSCORES"
        );

        const leaderboard = [];
        for (let i = 0; i < userIds.length; i += 2) {
          const userId = userIds[i];
          const score = parseFloat(userIds[i + 1]);

          const user = await User.findById(userId)
            .select("username name")
            .lean();

          if (user) {
            const percentage = Math.floor(score / 1000);
            const timeTaken = 1000000 - (score % 1000);

            leaderboard.push({
              userId,
              username: user.username,
              name: user.name,
              percentage,
              timeTaken,
              rank: Math.floor(i / 2) + 1,
            });
          }
        }

        return leaderboard;
      } else {
        // Fallback to MongoDB
        return await this.getCourseLeaderboardFromDB(
          courseId,
          difficulty,
          limit
        );
      }
    } catch (error) {
      console.error("Redis error, falling back to MongoDB:", error);
      return await this.getCourseLeaderboardFromDB(courseId, difficulty, limit);
    }
  }

  // MongoDB fallback for course leaderboards
  async getCourseLeaderboardFromDB(courseId, difficulty = "all", limit = 100) {
    try {
      const matchCriteria = { course: courseId };
      if (difficulty !== "all") {
        matchCriteria.difficulty = difficulty;
      }

      const results = await TestResult.aggregate([
        { $match: matchCriteria },
        { $sort: { percentage: -1, timeTaken: 1 } },
        {
          $group: {
            _id: "$user",
            bestPercentage: { $max: "$percentage" },
            bestTime: { $min: "$timeTaken" },
            totalTests: { $sum: 1 },
          },
        },
        { $sort: { bestPercentage: -1, bestTime: 1 } },
        { $limit: limit },
      ]);

      const leaderboard = await Promise.all(
        results.map(async (result, index) => {
          const user = await User.findById(result._id)
            .select("username name")
            .lean();
          return {
            userId: result._id.toString(),
            username: user?.username || "unknown",
            name: user?.name || "Unknown User",
            percentage: result.bestPercentage,
            timeTaken: result.bestTime,
            totalTests: result.totalTests,
            rank: index + 1,
          };
        })
      );

      return leaderboard;
    } catch (error) {
      console.error("MongoDB leaderboard fallback error:", error);
      return [];
    }
  }

  // Update course-specific leaderboard
  async updateLeaderboard(userId, courseId, difficulty, percentage, timeTaken) {
    try {
      const key = this.getLeaderboardKey(courseId, difficulty);
      const score = percentage * 1000 + (1000000 - timeTaken);

      await redisClient.zadd(key, score, userId.toString());
      await redisClient.expire(key, 7 * 24 * 60 * 60);

      return true;
    } catch (error) {
      console.error("Error updating Redis leaderboard:", error);
      return false;
    }
  }

  // Points-based course leaderboard (total points in a course)
  async getCourseLeaderboardWithPoints(
    courseId,
    difficulty = "all",
    limit = 100
  ) {
    try {
      const key = `leaderboard:points:${courseId}:${difficulty}`;
      const exists = await redisClient.exists(key);

      if (exists) {
        const userIds = await redisClient.zrevrange(
          key,
          0,
          limit - 1,
          "WITHSCORES"
        );
        return await this.formatCourseLeaderboard(
          userIds,
          courseId,
          difficulty
        );
      } else {
        return await this.rebuildCourseLeaderboardWithPoints(
          courseId,
          difficulty,
          limit
        );
      }
    } catch (error) {
      console.error("Error fetching course leaderboard with points:", error);
      return [];
    }
  }

  async rebuildCourseLeaderboardWithPoints(courseId, difficulty, limit) {
    const matchCriteria = { course: courseId };
    if (difficulty !== "all") {
      matchCriteria.difficulty = difficulty;
    }

    const results = await TestResult.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: "$user",
          bestPercentage: { $max: "$percentage" },
          fastestTime: { $min: "$timeTaken" },
          totalPoints: { $sum: "$pointsEarned" },
          testsCompleted: { $sum: 1 },
        },
      },
      { $sort: { totalPoints: -1, bestPercentage: -1, fastestTime: 1 } },
      { $limit: limit },
    ]);

    const leaderboard = await Promise.all(
      results.map(async (result, index) => {
        const user = await User.findById(result._id)
          .select("username name points badges")
          .lean();

        return {
          rank: index + 1,
          userId: result._id.toString(),
          username: user?.username || "unknown",
          name: user?.name || "Unknown User",
          points: result.totalPoints,
          percentage: result.bestPercentage,
          fastestTime: result.fastestTime,
          testsCompleted: result.testsCompleted,
          badges: user?.badges || [],
        };
      })
    );

    // Cache in Redis
    const key = `leaderboard:points:${courseId}:${difficulty}`;
    const pipeline = redisClient.pipeline();

    leaderboard.forEach((entry) => {
      pipeline.zadd(key, entry.points, entry.userId);
    });

    pipeline.expire(key, 7 * 24 * 60 * 60);
    await pipeline.exec();

    return leaderboard;
  }

  async formatCourseLeaderboard(redisResults, courseId, difficulty) {
    // Extract all user IDs first
    const userIds = [];
    for (let i = 0; i < redisResults.length; i += 2) {
      userIds.push(redisResults[i]);
    }

    // SINGLE database query to get all users at once
    const users = await User.find({ _id: { $in: userIds } })
      .select("username name badges")
      .lean();

    // Create a lookup map for O(1) access
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    // Get all test stats in a SINGLE aggregation query
    const mongoose = await import("mongoose");
    const courseObjectId = mongoose.Types.ObjectId.createFromHexString(courseId);

    const testStatsArray = await TestResult.aggregate([
      {
        $match: {
          user: { $in: userIds.map((id) => mongoose.Types.ObjectId.createFromHexString(id)) },
          course: courseObjectId,
        },
      },
      {
        $group: {
          _id: "$user",
          bestPercentage: { $max: "$percentage" },
          fastestTime: { $min: "$timeTaken" },
          testsCompleted: { $sum: 1 },
        },
      },
    ]);

    // Create stats lookup map
    const statsMap = new Map();
    testStatsArray.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    // Now build leaderboard array using the maps
    const leaderboard = [];
    for (let i = 0; i < redisResults.length; i += 2) {
      const userId = redisResults[i];
      const score = parseInt(redisResults[i + 1]);

      const user = userMap.get(userId);
      const stats = statsMap.get(userId) || {};

      // Decode the composite score
      const percentage = Math.floor(score / 1000);
      const timeTaken = 1000000 - (score % 1000);

      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        userId,
        username: user?.username || "unknown",
        name: user?.name || "Unknown User",
        points: score, // This is the composite score for sorting
        percentage: stats.bestPercentage || percentage,
        timeTaken: stats.fastestTime || timeTaken,
        testsCompleted: stats.testsCompleted || 0,
        badges: user?.badges || [],
        score, // Keep for reference
      });
    }

    return leaderboard;
  }

  // Add this method to initialize leaderboards on server startup
  async initialize() {
    try {
      console.log("Initializing leaderboard service...");
      // Optional: You can pre-populate Redis cache here if needed
      // For now, just confirm the service is ready
      console.log("Leaderboard service initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing leaderboard service:", error);
      throw error;
    }
  }

  // Add this method to get a user's rank in a course leaderboard
  async getUserRank(userId, courseId, difficulty = "all") {
    try {
      const key = this.getLeaderboardKey(courseId, difficulty);
      const exists = await redisClient.exists(key);

      if (exists) {
        // Get rank from Redis (0-based, so add 1)
        const rank = await redisClient.zrevrank(key, userId.toString());
        return rank !== null ? rank + 1 : null;
      } else {
        // Fallback to MongoDB
        return await this.getUserRankFromDB(userId, courseId, difficulty);
      }
    } catch (error) {
      console.error("Error getting user rank:", error);
      return await this.getUserRankFromDB(userId, courseId, difficulty);
    }
  }

  // Add this helper method for MongoDB rank lookup
  async getUserRankFromDB(userId, courseId, difficulty = "all") {
    try {
      const matchCriteria = { course: courseId };
      if (difficulty !== "all") {
        matchCriteria.difficulty = difficulty;
      }

      const results = await TestResult.aggregate([
        { $match: matchCriteria },
        { $sort: { percentage: -1, timeTaken: 1 } },
        {
          $group: {
            _id: "$user",
            bestPercentage: { $max: "$percentage" },
            bestTime: { $min: "$timeTaken" },
          },
        },
        { $sort: { bestPercentage: -1, bestTime: 1 } },
      ]);

      const userIndex = results.findIndex(
        (r) => r._id.toString() === userId.toString()
      );
      return userIndex !== -1 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Error getting user rank from DB:", error);
      return null;
    }
  }
}

export default new LeaderboardService();
