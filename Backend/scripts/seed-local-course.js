/**
 * creates an idempotent local course for testing login, timed attempts, and results
 *
 * @file backend/scripts/seed-local-course.js
 * @module backend/scripts/seed-local-course
 * @returns {promise<void>} closes mongodb after the fixture is written
 */

import "dotenv/config";
import mongoose from "mongoose";
import Course from "../Models/Course.js";

const courseName = "Foundations of Motion and Energy";
const courseImageUrl = "https://www.marshall.edu/physics/files/Upward-bound.jpg";

const questions = [
  ["Easy", "Which quantity measures how fast an object changes position?", ["Speed", "Mass", "Force", "Energy"], 0, "Speed describes how fast position changes with time."],
  ["Easy", "What is the SI unit of force?", ["Joule", "Newton", "Watt", "Pascal"], 1, "Force is measured in newtons."],
  ["Easy", "Kinetic energy depends on an object's motion.", ["True", "False"], 0, "Kinetic energy is energy associated with motion."],
  ["Medium", "A body travels 20 metres in 4 seconds. What is its average speed?", ["4 m/s", "5 m/s", "8 m/s", "16 m/s"], 1, "Average speed is distance divided by time, so 20 divided by 4 is 5 m/s."],
  ["Medium", "Which law explains action and reaction forces?", ["Newton's first law", "Newton's second law", "Newton's third law", "The law of gravitation"], 2, "Newton's third law states that forces occur in equal and opposite pairs."],
  ["Medium", "Work is done when a force causes displacement.", ["True", "False"], 0, "Mechanical work requires a component of force along displacement."],
  ["Hard", "A 2 kg object accelerates at 3 m/s2. What force acts on it?", ["1.5 N", "5 N", "6 N", "9 N"], 2, "Newton's second law gives force as mass times acceleration: 2 times 3 equals 6 N."],
  ["Hard", "Which expression represents gravitational potential energy near Earth's surface?", ["mv", "mgh", "ma", "1/2 mv2"], 1, "Near the surface, gravitational potential energy is mass times gravitational acceleration times height."],
  ["Hard", "For an isolated system, total energy is conserved.", ["True", "False"], 0, "Energy changes form but the total remains constant in an isolated system."],
].map(([difficulty, question, options, correctAnswer, explanation]) => ({
  difficulty,
  question,
  numberOfOptions: options.length,
  questionType: "multiple",
  options,
  correctAnswer,
  explanation,
  isActive: true,
}));

const difficulties = [
  { name: "Easy", marksPerQuestion: 2, maxQuestions: 3, totalMarks: 6, timerSettings: { minTime: 180, maxTime: 300 } },
  { name: "Medium", marksPerQuestion: 3, maxQuestions: 3, totalMarks: 9, timerSettings: { minTime: 240, maxTime: 420 } },
  { name: "Hard", marksPerQuestion: 5, maxQuestions: 3, totalMarks: 15, timerSettings: { minTime: 300, maxTime: 540 } },
];

const main = async () => {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_LOCAL_COURSE_SEED !== "true") {
    throw new Error("set ALLOW_LOCAL_COURSE_SEED=true in a non-production environment to seed the local course");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const course = await Course.findOneAndUpdate(
    { name: courseName },
    {
      name: courseName,
      description: "A guided physics practice course covering motion, force, work, and energy with generous timed attempts for local flow testing.",
      image: { url: courseImageUrl },
      difficulties,
      maxQuestionsPerTest: 3,
      isPaid: false,
      price: 0,
      currency: "INR",
      questions,
      totalQuestions: questions.length,
      isActive: true,
      teacher: null,
      approvalStatus: "approved",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  console.log(`local course ready: ${course._id}`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("local course seed failed:", error.message);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
