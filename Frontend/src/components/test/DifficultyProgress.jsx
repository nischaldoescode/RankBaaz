import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const DifficultyProgress = ({ 
  difficulties = [], 
  currentDifficulty, 
  completedDifficulties = [],
  overallProgress = 0
}) => {
  const getDifficultyStatus = (diffName) => {
    if (completedDifficulties.includes(diffName)) return 'completed';
    if (currentDifficulty === diffName) return 'current';
    return 'upcoming';
  };

  const getDifficultyStyles = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'current':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Test Progress
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {Math.round(overallProgress)}% Complete
        </span>
      </div>

      {/* Overall Progress Bar */}
      <Progress value={overallProgress} className="mb-4 h-2" />

      {/* Difficulty Pills */}
      <div className="flex flex-wrap gap-2">
        {difficulties.map((diff) => {
          const status = getDifficultyStatus(diff.name);
          return (
            <div
              key={diff.name}
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium",
                getDifficultyStyles(status)
              )}
            >
              {status === 'completed' && (
                <CheckCircle className="w-3 h-3" />
              )}
              {status === 'current' && (
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              )}
              <span>{diff.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DifficultyProgress;