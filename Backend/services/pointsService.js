import User from "../Models/User.js";
import TestResult from "../Models/TestResult.js";
import redisClient from "../Config/redis.js";

class PointsService {
  // Point calculation constants
  POINTS_CONFIG = {
    BASE_COMPLETION: 10,
    PERCENTAGE_MULTIPLIER: 0.5,
    TIME_BONUS_MAX: 5,
    QUESTION_POINTS: 0.2,
    DEDUCTION_EASY: 2,
    DEDUCTION_MEDIUM: 5,
    DEDUCTION_HARD: 7,
    MAX_DEDUCTION: 7,
  };

  calculatePointsForTest(testResult) {
    let points = 0;

    // Base completion points
    points += this.POINTS_CONFIG.BASE_COMPLETION;

    // Percentage-based points (0-50 points for 0-100%)
    points += testResult.percentage * this.POINTS_CONFIG.PERCENTAGE_MULTIPLIER;

    // Question points (0.2 per question answered)
    points += testResult.totalQuestions * this.POINTS_CONFIG.QUESTION_POINTS;

    // Time bonus (faster completion = more points, max 5)
    if (testResult.testSettings?.maxTime && testResult.timeTaken) {
      const timeRatio = testResult.timeTaken / testResult.testSettings.maxTime;
      const timeBonus = Math.max(
        0,
        this.POINTS_CONFIG.TIME_BONUS_MAX * (1 - timeRatio)
      );
      points += timeBonus;
    }

    // Difficulty multiplier
    const difficultyMultipliers = { Easy: 1, Medium: 1.5, Hard: 2 };
    if (Array.isArray(testResult.difficulty)) {
      const avgMultiplier =
        testResult.difficulty.reduce(
          (sum, diff) => sum + (difficultyMultipliers[diff] || 1),
          0
        ) / testResult.difficulty.length;
      points *= avgMultiplier;
    } else {
      points *= difficultyMultipliers[testResult.difficulty] || 1;
    }

    return Math.round(points);
  }

  calculateDeductionForAbandonment(abandonedAtDifficulty) {
    if (!abandonedAtDifficulty) return 0;

    const deductions = {
      Easy: this.POINTS_CONFIG.DEDUCTION_EASY,
      Medium: this.POINTS_CONFIG.DEDUCTION_MEDIUM,
      Hard: this.POINTS_CONFIG.DEDUCTION_HARD,
    };

    return deductions[abandonedAtDifficulty] || 0;
  }

  async updateUserPoints(userId, pointsChange, reason) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { points: pointsChange } },
        { new: true }
      );

      // Update Redis leaderboard cache
      await this.updateGlobalLeaderboard(userId, user.points);

      return user.points;
    } catch (error) {
      console.error("Error updating user points:", error);
      throw error;
    }
  }

  async updateGlobalLeaderboard(userId, points) {
    try {
      const key = "global:leaderboard:points";
      await redisClient.zadd(key, points, userId.toString());
      await redisClient.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      console.error("Error updating global leaderboard:", error);
    }
  }

  async getGlobalLeaderboard(limit = 100) {
    try {
      const key = "global:leaderboard:points";
      const exists = await redisClient.exists(key);

      if (exists) {
        // Fetch from Redis
        const results = await redisClient.zrevrange(
          key,
          0,
          limit - 1,
          "WITHSCORES"
        );
        return this.formatLeaderboardResults(results);
      } else {
        // Rebuild from MongoDB
        return await this.rebuildGlobalLeaderboard(limit);
      }
    } catch (error) {
      console.error("Error fetching global leaderboard:", error);
      return await this.fallbackToDatabase(limit);
    }
  }

  async formatLeaderboardResults(redisResults) {
    // Extract all user IDs
    const userIds = [];
    for (let i = 0; i < redisResults.length; i += 2) {
      userIds.push(redisResults[i]);
    }

    // SINGLE bulk query
    const users = await User.find({ _id: { $in: userIds } })
      .select("username name points badges stats")
      .lean();

    // Create lookup map
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    // Build leaderboard using map
    const leaderboard = [];
    for (let i = 0; i < redisResults.length; i += 2) {
      const userId = redisResults[i];
      const score = parseInt(redisResults[i + 1]);
      const user = userMap.get(userId);

      if (user) {
        // Decode the composite score
        // Score format: percentage * 1000 + (1000000 - timeTaken)
        const percentage = Math.floor(score / 1000);
        const timeTaken = 1000000 - (score % 1000);

        leaderboard.push({
          rank: Math.floor(i / 2) + 1,
          userId,
          username: user.username,
          name: user.name,
          points: user.points,
          percentage,
          timeTaken,
          score, // Keep original score for reference
          badges: user.badges,
          testsCompleted: user.stats.testsCompleted,
          averagePercentile: user.stats.averagePercentile,
        });
      }
    }
    return leaderboard;
  }

  async rebuildGlobalLeaderboard(limit) {
    const users = await User.find({
      // it will include only those users twho have completed at least one test
      "stats.testsCompleted": { $gt: 0 },
    })
      .sort({ points: -1 })
      .limit(limit)
      .select("username name points badges stats")
      .lean();

    const key = "global:leaderboard:points";
    const pipeline = redisClient.pipeline();

    users.forEach((user) => {
      pipeline.zadd(key, user.points, user._id.toString());
    });

    pipeline.expire(key, 24 * 60 * 60);
    await pipeline.exec();

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      name: user.name,
      points: user.points,
      badges: user.badges,
      testsCompleted: user.stats.testsCompleted,
      averagePercentile: user.stats.averagePercentile,
    }));
  }

  async fallbackToDatabase(limit) {
    const users = await User.find({
      "stats.testsCompleted": { $gt: 0 },
    })
      .sort({ points: -1 })
      .limit(limit)
      .select("username name points badges stats")
      .lean();

    return users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      name: user.name,
      points: user.points,
      badges: user.badges,
      testsCompleted: user.stats.testsCompleted,
      averagePercentile: user.stats.averagePercentile,
    }));
  }

  async getUserRank(userId) {
    try {
      const key = "global:leaderboard:points";
      const rank = await redisClient.zrevrank(key, userId.toString());
      return rank !== null ? rank + 1 : null;
    } catch (error) {
      // Fallback to database
      const user = await User.findById(userId).select("points");
      if (!user) return null;

      const higherRanked = await User.countDocuments({
        points: { $gt: user.points },
      });
      return higherRanked + 1;
    }
  }
}

export default new PointsService();
