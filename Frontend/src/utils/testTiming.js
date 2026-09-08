/**
 * normalizes test timing values and derives a safe difficulty duration
 * 
 * @file frontend/src/utils/testtiming.js
 * @module frontend/src/utils/testtiming
 * @exports timing helpers used by the test context and local checks
 */

/**
 * converts a seconds value or mm:ss value into positive seconds
 *
 * @param {unknown} value raw timing value returned by the api
 * @returns {number} normalized seconds or zero when the value is unusable
 */
export const parseTimerSeconds = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;

    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    if (typeof value !== "string") continue;

    const trimmed = value.trim();
    const parts = trimmed.split(":").map((part) => Number(part));
    if (
      parts.length === 2 &&
      parts.every((part) => Number.isFinite(part) && part >= 0)
    ) {
      const seconds = parts[0] * 60 + parts[1];
      if (seconds > 0) return Math.floor(seconds);
      continue;
    }

    const numericValue = Number(trimmed);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return Math.floor(numericValue);
    }
  }

  return 0;
};

/**
 * derives per-question and total time from the server test payload
 *
 * @param {object} testData payload returned by the start-test endpoint
 * @returns {{questionTimeLimit: number, totalTime: number}} safe timing values
 */
export const resolveTestTiming = (testData = {}) => {
  const difficulty = testData.courseInfo?.difficulty;
  const questionTimeLimit = Math.max(
    1,
    parseTimerSeconds(
      difficulty?.timerSettings?.maxTime,
      difficulty?.maxTime,
      testData.courseInfo?.maxTime,
      testData.maxTime,
    ),
  );
  const questionCount = Math.max(1, testData.questions?.length || 0);
  const serverTotal = parseTimerSeconds(testData.courseInfo?.totalTime);

  return {
    questionTimeLimit,
    totalTime: Math.max(
      questionTimeLimit,
      serverTotal || questionTimeLimit * questionCount,
    ),
  };
};
