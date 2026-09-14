/**
 * calculates a transparent local readiness signal from learner choice and practice history
 *
 * @file backend/services/studyreadinessservice.js
 * @module backend/services/studyreadinessservice
 * @param {object} user lean user record with learning level and practice stats
 * @returns {object} bounded readiness details safe for the learner interface
 */

const LEVELS = ["beginner", "intermediate", "advanced"];

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const normalizeLevel = (value) => {
  const level = String(value || "beginner").toLowerCase();
  return LEVELS.includes(level) ? level : "beginner";
};

const levelBaseline = {
  beginner: 24,
  intermediate: 48,
  advanced: 68,
};

const levelLabel = {
  beginner: "beginner path",
  intermediate: "intermediate path",
  advanced: "advanced path",
};

/**
 * turns practice signals into useful next steps without storing a hidden score
 *
 * @param {object} user lean user record
 * @returns {object} readiness score, explanation, and next steps
 */
export const buildStudyReadiness = (user) => {
  const level = normalizeLevel(user?.learningLevel);
  const testsCompleted = clamp(Number(user?.stats?.testsCompleted || 0), 0, 100000);
  const questionsAnswered = clamp(Number(user?.stats?.questionsAnswered || 0), 0, 1000000);
  const averagePercentile = clamp(Number(user?.stats?.averagePercentile || 0), 0, 100);
  const activitySignal = clamp(Math.log1p(testsCompleted) * 11, 0, 24);
  const volumeSignal = clamp(Math.log1p(questionsAnswered) * 2.4, 0, 16);
  const accuracySignal = averagePercentile * 0.16;
  const score = Math.round(
    clamp(levelBaseline[level] + activitySignal + volumeSignal + accuracySignal, 0, 100),
  );

  const nextSteps = [];
  if (testsCompleted < 1) nextSteps.push("complete one short test to set a starting point");
  if (questionsAnswered < 20) nextSteps.push("answer a few more questions to make the signal steadier");
  if (averagePercentile < 60) nextSteps.push("review explanations after each attempt");
  if (nextSteps.length === 0) nextSteps.push("keep a regular practice rhythm and try the next difficulty");

  return {
    score,
    level,
    label: levelLabel[level],
    confidence: testsCompleted >= 3 && questionsAnswered >= 30 ? "steady" : "early",
    inputs: {
      testsCompleted,
      questionsAnswered,
      averagePercentile: Math.round(averagePercentile),
    },
    nextSteps: nextSteps.slice(0, 3),
    method: "local transparent readiness model",
  };
};

export default buildStudyReadiness;
