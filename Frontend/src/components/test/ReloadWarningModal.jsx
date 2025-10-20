import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ReloadWarningModal = ({ isOpen, onStay, onLeave, testProgress }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{ zIndex: 99999 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onStay}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <Card className="p-6 shadow-2xl border-2 border-yellow-200 dark:border-yellow-800">
            {/* Close button */}
            <button
              onClick={onStay}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>

            {/* Warning icon */}
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center"
              >
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Leave Test?
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You have an active test in progress. If you leave now, all your progress will be lost and you'll need to start over.
              </p>

              {/* Progress info */}
              {testProgress && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6">
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <div className="font-medium mb-1">Current Progress:</div>
                    <div>Questions answered: {testProgress.answered}/{testProgress.total}</div>
                    <div>Time remaining: {testProgress.timeRemaining}</div>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to leave this test?
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={onStay}
                  className="flex-1 cursor-pointer"
                >
                  Stay in Test
                </Button>
                <Button
                  variant="destructive"
                  onClick={onLeave}
                  className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700"
                >
                  Leave Test
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReloadWarningModal;