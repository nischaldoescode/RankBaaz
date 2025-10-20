import redisClient from "../Config/redis.js";

class QuestionCacheService {
  // Cache question data for 1 hour
  async cacheQuestion(courseId, questionId, questionData) {
    const key = `question:${courseId}:${questionId}`;
    await redisClient.setex(key, 3600, JSON.stringify(questionData));
  }

  // Get cached question
  async getCachedQuestion(courseId, questionId) {
    const key = `question:${courseId}:${questionId}`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Invalidate cache when question is updated
  async invalidateQuestion(courseId, questionId) {
    const key = `question:${courseId}:${questionId}`;
    await redisClient.del(key);
  }

  // Invalidate all questions for a course
  async invalidateCourse(courseId) {
    const pattern = `question:${courseId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  }
}

export default new QuestionCacheService();