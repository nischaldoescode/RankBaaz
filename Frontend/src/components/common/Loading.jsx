import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';

const Loading = ({ 
  variant = 'page',
  size = 'medium',
  className = ''
}) => {
  const { animations, reducedMotion } = useTheme();

  // Button spinner for small loading states
  if (variant === 'button') {
    return (
      <motion.div
        animate={animations && !reducedMotion ? { rotate: 360 } : {}}
        transition={animations && !reducedMotion ? {
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        } : {}}
        className="flex items-center justify-center"
      >
        <Loader2 className={`animate-spin ${
          size === 'small' ? 'w-4 h-4' : 
          size === 'medium' ? 'w-5 h-5' : 
          'w-6 h-6'
        }`} />
      </motion.div>
    );
  }

  // Shimmer animation for skeleton effect
  const shimmerVariants = {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
  };

  const shimmerTransition = {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  };

  // Base skeleton classes
  const skeletonBase = "bg-slate-200 dark:bg-slate-700 rounded animate-pulse";
  const shimmerBase = `${skeletonBase} bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%]`;

  // Skeleton variants for different content types
  const renderSkeleton = () => {
    switch (variant) {
      case 'auth':
        return (
          <div className="w-full max-w-md mx-auto space-y-6 px-4">
            {/* Back button skeleton */}
            <motion.div 
              className={`${shimmerBase} h-6 w-32`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? shimmerTransition : {}}
            />

            {/* Header skeleton */}
            <div className="text-center space-y-3">
              <motion.div 
                className={`${shimmerBase} h-8 w-48 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />
              <motion.div 
                className={`${shimmerBase} h-5 w-64 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
              />
            </div>

            {/* Form card skeleton */}
            <div className="bg-card/60 backdrop-blur-sm rounded-lg shadow-2xl p-6 sm:p-8 space-y-4">
              {/* Form fields skeleton */}
              {[1, 2, 3, 4].map((field) => (
                <div key={field} className="space-y-2">
                  <motion.div 
                    className={`${shimmerBase} h-4 w-24`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: field * 0.05 } : {}}
                  />
                  <motion.div 
                    className={`${shimmerBase} h-11 w-full`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: field * 0.05 + 0.1 } : {}}
                  />
                </div>
              ))}

              {/* Checkbox/links skeleton */}
              <div className="flex items-center justify-between">
                <motion.div 
                  className={`${shimmerBase} h-4 w-24`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? shimmerTransition : {}}
                />
                <motion.div 
                  className={`${shimmerBase} h-4 w-32`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
                />
              </div>

              {/* Button skeleton */}
              <motion.div 
                className={`${shimmerBase} h-11 w-full rounded-md`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />

              {/* Footer links skeleton */}
              <div className="text-center pt-4 border-t border-border/50 space-y-2">
                <motion.div 
                  className={`${shimmerBase} h-4 w-48 mx-auto`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? shimmerTransition : {}}
                />
                <motion.div 
                  className={`${shimmerBase} h-3 w-32 mx-auto`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
                />
              </div>
            </div>
          </div>
        );

      case 'page':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Hero section skeleton */}
            <div className="text-center space-y-4">
              <motion.div 
                className={`${shimmerBase} h-12 w-3/4 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />
              <motion.div 
                className={`${shimmerBase} h-6 w-1/2 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
              />
            </div>

            {/* Cards grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <motion.div 
                  key={index}
                  className="space-y-3"
                  initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
                  animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
                  transition={animations && !reducedMotion ? { delay: index * 0.1 } : {}}
                >
                  <motion.div 
                    className={`${shimmerBase} h-48 w-full`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 } : {}}
                  />
                  <motion.div 
                    className={`${shimmerBase} h-6 w-3/4`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 + 0.1 } : {}}
                  />
                  <motion.div 
                    className={`${shimmerBase} h-4 w-1/2`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 + 0.2 } : {}}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-3">
            <motion.div 
              className={`${shimmerBase} h-48 w-full`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? shimmerTransition : {}}
            />
            <motion.div 
              className={`${shimmerBase} h-6 w-3/4`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
            />
            <motion.div 
              className={`${shimmerBase} h-4 w-1/2`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.2 } : {}}
            />
          </div>
        );

      case 'list':
        return (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <motion.div 
                key={index}
                className="flex items-center space-x-4"
                initial={animations && !reducedMotion ? { opacity: 0, x: -20 } : {}}
                animate={animations && !reducedMotion ? { opacity: 1, x: 0 } : {}}
                transition={animations && !reducedMotion ? { delay: index * 0.1 } : {}}
              >
                <motion.div 
                  className={`${shimmerBase} h-12 w-12 rounded-full flex-shrink-0`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 } : {}}
                />
                <div className="flex-1 space-y-2">
                  <motion.div 
                    className={`${shimmerBase} h-4 w-3/4`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 + 0.1 } : {}}
                  />
                  <motion.div 
                    className={`${shimmerBase} h-3 w-1/2`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 + 0.2 } : {}}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'profile':
        return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Profile header skeleton */}
            <div className="text-center space-y-4 mb-8">
              <motion.div 
                className={`${shimmerBase} h-24 w-24 rounded-full mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />
              <motion.div 
                className={`${shimmerBase} h-8 w-48 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
              />
              <motion.div 
                className={`${shimmerBase} h-4 w-32 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.2 } : {}}
              />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((index) => (
                <motion.div 
                  key={index}
                  className="text-center space-y-2"
                  initial={animations && !reducedMotion ? { opacity: 0, scale: 0.9 } : {}}
                  animate={animations && !reducedMotion ? { opacity: 1, scale: 1 } : {}}
                  transition={animations && !reducedMotion ? { delay: index * 0.1 } : {}}
                >
                  <motion.div 
                    className={`${shimmerBase} h-8 w-16 mx-auto`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 } : {}}
                  />
                  <motion.div 
                    className={`${shimmerBase} h-4 w-20 mx-auto`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: index * 0.05 + 0.1 } : {}}
                  />
                </motion.div>
              ))}
            </div>

            {/* Content skeleton */}
            <div className="space-y-6">
              {[1, 2].map((section) => (
                <div key={section} className="space-y-4">
                  <motion.div 
                    className={`${shimmerBase} h-6 w-40`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: section * 0.1 } : {}}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((item) => (
                      <motion.div 
                        key={item}
                        className={`${shimmerBase} h-20 w-full`}
                        variants={animations && !reducedMotion ? shimmerVariants : {}}
                        animate={animations && !reducedMotion ? "animate" : {}}
                        transition={animations && !reducedMotion ? { ...shimmerTransition, delay: section * 0.1 + item * 0.05 } : {}}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Test header */}
            <div className="text-center space-y-4 mb-8">
              <motion.div 
                className={`${shimmerBase} h-10 w-3/4 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />
              <motion.div 
                className={`${shimmerBase} h-6 w-1/2 mx-auto`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
              />
            </div>

            {/* Question skeleton */}
            <div className="space-y-6">
              <motion.div 
                className={`${shimmerBase} h-24 w-full`}
                variants={animations && !reducedMotion ? shimmerVariants : {}}
                animate={animations && !reducedMotion ? "animate" : {}}
                transition={animations && !reducedMotion ? shimmerTransition : {}}
              />
              
              {/* Options skeleton */}
              <div className="space-y-3">
                {[1, 2, 3, 4].map((option) => (
                  <motion.div 
                    key={option}
                    className={`${shimmerBase} h-12 w-full`}
                    variants={animations && !reducedMotion ? shimmerVariants : {}}
                    animate={animations && !reducedMotion ? "animate" : {}}
                    transition={animations && !reducedMotion ? { ...shimmerTransition, delay: option * 0.05 } : {}}
                  />
                ))}
              </div>

              {/* Navigation skeleton */}
              <div className="flex justify-between items-center pt-6">
                <motion.div 
                  className={`${shimmerBase} h-10 w-24`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? shimmerTransition : {}}
                />
                <motion.div 
                  className={`${shimmerBase} h-10 w-24`}
                  variants={animations && !reducedMotion ? shimmerVariants : {}}
                  animate={animations && !reducedMotion ? "animate" : {}}
                  transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <motion.div 
              className={`${shimmerBase} h-8 w-48`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? shimmerTransition : {}}
            />
            <motion.div 
              className={`${shimmerBase} h-4 w-32`}
              variants={animations && !reducedMotion ? shimmerVariants : {}}
              animate={animations && !reducedMotion ? "animate" : {}}
              transition={animations && !reducedMotion ? { ...shimmerTransition, delay: 0.1 } : {}}
            />
          </div>
        );
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {renderSkeleton()}
    </div>
  );
};

export default Loading;