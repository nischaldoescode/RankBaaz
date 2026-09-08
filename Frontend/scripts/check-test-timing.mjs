/**
 * checks the public test timing contract without a browser or api connection
 *
 * @file frontend/scripts/check-test-timing.mjs
 * @module frontend/scripts/check-test-timing
 * @returns {void} exits with a failure code when timing rules regress
 */

import assert from "node:assert/strict";
import { resolveTestTiming } from "../src/utils/testTiming.js";

const derived = resolveTestTiming({
  questions: [{ _id: "one" }, { _id: "two" }, { _id: "three" }],
  courseInfo: {
    difficulty: { timerSettings: { maxTime: 300 } },
  },
});

assert.deepEqual(derived, { questionTimeLimit: 300, totalTime: 900 });

const serverTotalWins = resolveTestTiming({
  questions: [{ _id: "one" }, { _id: "two" }],
  courseInfo: {
    totalTime: "12:00",
    difficulty: { timerSettings: { maxTime: 300 } },
  },
});

assert.deepEqual(serverTotalWins, { questionTimeLimit: 300, totalTime: 720 });
console.log("test timing checks passed");
