// TODO: Look at line 15
// ----------------------

/**
 * shows the student's current daily study streak on their profile/dashboard
 *
 * @file frontend/src/components/Leaderboard/StreakTracker.jsx
 * @module frontend/src/components/Leaderboard/StreakTracker
 * @exports component used by Profile and Dashboard pages
 */

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";


// this component only ever receives a number through the `currentStreak` prop.
//
// The logic to add:
// Think of it like a candle. A candle that hasn't been lit yet looks
// different from one that's burning — right now this component always
// looks "lit" no matter what, even when the streak is 0. Add a check:
//   - if currentStreak is 0   -> show the "unlit" version: a plain/gray
//     flame icon and encouraging text like "Start a streak today"
//   - if currentStreak is 1+  -> show the normal version: the flame icon
//     as it is now, with "{currentStreak} day streak"
// That's the whole feature. One condition, two outcomes.
//
// How to test this on its own, without running the rest of the app:
// 1. Since this component only needs one prop, you can try both states by
//    temporarily rendering it twice wherever it's already used, e.g. in
//    Profile.jsx:
//      <StreakTracker currentStreak={0} />
//      <StreakTracker currentStreak={7} />
//    Look at both on the page, check the 0 case shows the "unlit" version
//    and the 7 case shows the normal version, then delete the extra line.
// 2. That manual check is enough for something this small. If you want a
//    repeatable automated version later, React Testing Library can do it:
//    render <StreakTracker currentStreak={0} /> and assert the text
//    "Start a streak today" appears, then render currentStreak={7} and
//    assert "7 day streak" appears — two short test cases, no server or
//    database needed since the component never talks to either.


export default function StreakTracker({ currentStreak = 0 }) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2")}>
      <Flame className="h-5 w-5" />
      <span className="text-sm font-semibold">{currentStreak} day streak</span>
    </div>
  );
}