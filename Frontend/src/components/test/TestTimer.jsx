import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TestTimer = ({ 
  timeRemaining, 
  totalTime, 
  isRunning = true,
  onTimeUp,
  onWarning,
  className = ""
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const [showMilliseconds, setShowMilliseconds] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const intervalRef = useRef(null);
  const millisecondsRef = useRef(0);

  useEffect(() => {
    setDisplayTime(timeRemaining);
    
    // Show milliseconds when under 10 seconds
    setShowMilliseconds(timeRemaining <= 10);
    
    // Set warning states
    const warningThreshold = Math.max(30, totalTime * 0.1); // 30s or 10% of total time
    const criticalThreshold = 10;
    
    setIsWarning(timeRemaining <= warningThreshold && timeRemaining > criticalThreshold);
    setIsCritical(timeRemaining <= criticalThreshold);
    
    // Trigger callbacks
    if (timeRemaining <= criticalThreshold && timeRemaining > 0) {
      onWarning?.('critical');
    } else if (timeRemaining <= warningThreshold && timeRemaining > criticalThreshold) {
      onWarning?.('warning');
    }
    
    if (timeRemaining === 0) {
      onTimeUp?.();
    }
  }, [timeRemaining, totalTime, onTimeUp, onWarning]);

  // Handle milliseconds display for last 10 seconds
  useEffect(() => {
    if (showMilliseconds && isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        millisecondsRef.current = (millisecondsRef.current + 100) % 1000;
        if (millisecondsRef.current === 0) {
          // This will be handled by parent component's timer
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      millisecondsRef.current = 0;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showMilliseconds, isRunning, timeRemaining]);

  const formatTime = (seconds, includeMs = false) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const ms = millisecondsRef.current;
    
    if (includeMs && showMilliseconds) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${Math.floor(ms / 100)}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((totalTime - timeRemaining) / totalTime) * 100;
  };

  const getTimerVariant = () => {
    if (isCritical) return 'critical';
    if (isWarning) return 'warning';
    return 'normal';
  };

  const getTimerStyles = () => {
    const baseStyles = "transition-all duration-300";
    
    switch (getTimerVariant()) {
      case 'critical':
        return cn(baseStyles, "text-red-600 dark:text-red-400");
      case 'warning':
        return cn(baseStyles, "text-yellow-600 dark:text-yellow-400");
      default:
        return cn(baseStyles, "text-gray-900 dark:text-gray-100");
    }
  };

  const getCardStyles = () => {
    const baseStyles = "transition-all duration-300";
    
    switch (getTimerVariant()) {
      case 'critical':
        return cn(baseStyles, "border-red-500 bg-red-50 dark:bg-red-950/20 shadow-lg shadow-red-100 dark:shadow-red-900/20");
      case 'warning':
        return cn(baseStyles, "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 shadow-lg shadow-yellow-100 dark:shadow-yellow-900/20");
      default:
        return cn(baseStyles, "border-gray-200 dark:border-gray-700");
    }
  };

  const getIconComponent = () => {
    switch (getTimerVariant()) {
      case 'critical':
        return <Zap className="w-5 h-5 text-red-600 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <Card className={cn(getCardStyles(), className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getIconComponent()}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {isCritical ? 'Time Critical!' : isWarning ? 'Time Warning' : 'Time Remaining'}
            </span>
          </div>
          
          {/* Pulse indicator for critical time */}
          {isCritical && (
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Timer Display */}
        <div className="text-center mb-3">
          <div className={cn("text-2xl font-mono font-bold", getTimerStyles())}>
            {formatTime(displayTime, showMilliseconds)}
            {showMilliseconds && (
              <span className="text-sm ml-1 opacity-75">
                ({Math.floor(millisecondsRef.current / 100)})
              </span>
            )}
          </div>
          
          {/* Time status text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isCritical && "Hurry up! Time is almost over!"}
            {isWarning && !isCritical && "Please manage your time wisely"}
            {!isWarning && !isCritical && `${Math.floor((displayTime / totalTime) * 100)}% time remaining`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Progress</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          
          <Progress 
            value={getProgressPercentage()} 
            className={cn(
              "h-2 transition-all duration-300",
              isCritical && "bg-red-100 dark:bg-red-900/30",
              isWarning && !isCritical && "bg-yellow-100 dark:bg-yellow-900/30"
            )}
          />
        </div>

        {/* Additional info for critical state */}
        {isCritical && (
          <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200 text-center">
            Test will auto-submit when time expires
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestTimer;