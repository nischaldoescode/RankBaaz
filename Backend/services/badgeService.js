import User from "../Models/User.js";
import TestResult from "../Models/TestResult.js";
import pointsService from "./pointsService.js";

class BadgeService {
  BADGE_TYPES = {
    LEADERBOARD_LEGEND: {
      type: "leaderboard_legend",
      name: "Leaderboard Legend",
      description: "Stay in top position for 20 consecutive days",
      requirement: 20,
    },
    PERFECTIONIST: {
      type: "perfectionist",
      name: "Perfectionist",
      description: "Complete any course test with 100% accuracy",
    },
    SPEED_DEMON: {
      type: "speed_demon",
      name: "Speed Demon",
      description:
        "Complete 50 tests with average time 20% faster than allowed",
      requirement: 50,
    },
  };

  async checkAndAwardBadges(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    const earnedBadges = user.badges.map((b) => b.type);

    // Check Leaderboard Legend
    if (!earnedBadges.includes("leaderboard_legend")) {
      await this.checkLeaderboardLegend(user);
    }

    // Check Perfectionist
    if (!earnedBadges.includes("perfectionist")) {
      await this.checkPerfectionist(user);
    }

    // Check Speed Demon
    if (!earnedBadges.includes("speed_demon")) {
      await this.checkSpeedDemon(user);
    }
  }

  async checkLeaderboardLegend(user) {
    const rank = await pointsService.getUserRank(user._id);

    if (rank === 1) {
      const today = new Date().setHours(0, 0, 0, 0);
      const lastCheck = user.stats.lastTopPosition
        ? new Date(user.stats.lastTopPosition).setHours(0, 0, 0, 0)
        : null;

      if (lastCheck === today - 86400000) {
        // Consecutive day
        user.stats.leaderboardDaysOnTop += 1;
      } else if (lastCheck !== today) {
        // Reset if missed a day
        user.stats.leaderboardDaysOnTop = 1;
      }

      user.stats.lastTopPosition = new Date();

      if (
        user.stats.leaderboardDaysOnTop >=
        this.BADGE_TYPES.LEADERBOARD_LEGEND.requirement
      ) {
        await this.awardBadge(user, "leaderboard_legend");
      }
    } else {
      // Not in top position, reset counter
      user.stats.leaderboardDaysOnTop = 0;
    }

    await user.save();
  }

  async checkPerfectionist(user) {
    const perfectTest = await TestResult.findOne({
      user: user._id,
      percentage: 100,
      wrongAnswers: 0,
    });

    if (perfectTest) {
      await this.awardBadge(user, "perfectionist");
    }
  }

  async checkSpeedDemon(user) {
    const tests = await TestResult.find({
      user: user._id,
    }).select("timeTaken testSettings");

    let fastTests = 0;
    tests.forEach((test) => {
      if (test.testSettings?.maxTime) {
        const threshold = test.testSettings.maxTime * 0.8; // 20% faster
        if (test.timeTaken <= threshold) {
          fastTests++;
        }
      }
    });

    if (fastTests >= this.BADGE_TYPES.SPEED_DEMON.requirement) {
      await this.awardBadge(user, "speed_demon");
    }
  }

  async awardBadge(user, badgeType) {
    const existingBadge = user.badges.find((b) => b.type === badgeType);
    if (!existingBadge) {
      user.badges.push({
        type: badgeType,
        earnedAt: new Date(),
      });
      await user.save();
      return true;
    }
    return false;
  }

  getBadgeInfo(badgeType) {
    return Object.values(this.BADGE_TYPES).find((b) => b.type === badgeType);
  }

  getAllBadgeInfo() {
    return Object.values(this.BADGE_TYPES);
  }
}

export default new BadgeService();
