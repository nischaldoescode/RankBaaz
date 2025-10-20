import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useTests } from '../../context/TestContext';
import { 
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Loading from '../common/Loading';

const TestHistory = () => {
  const navigate = useNavigate();
  const { theme, animations, reducedMotion, getPrimaryColorClasses } = useTheme();
  const { getTestHistory, testHistory, loading, error } = useTests();

  const [filteredHistory, setFilteredHistory] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all', // all, completed, abandoned, in_progress
    course: '',
    dateRange: '30', // 7, 30, 90, all
    sortBy: 'date_desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);

  const primaryColors = getPrimaryColorClasses();

  // Load test history
  useEffect(() => {
    if (!testHistory.length) {
      getTestHistory({
        page: 1,
        limit: 50,
        sortBy: filters.sortBy
      });
    }
  }, [testHistory, getTestHistory, filters.sortBy]);

  // Filter and sort history
  useEffect(() => {
    if (!testHistory.length) return;

    let filtered = [...testHistory];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(test => 
        test.courseTitle?.toLowerCase().includes(filters.search.toLowerCase()) ||
        test.courseName?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(test => test.status === filters.status);
    }

    // Course filter
    if (filters.course) {
      filtered = filtered.filter(test => test.courseId === filters.course);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      filtered = filtered.filter(test => 
        new Date(test.completedAt || test.startedAt) >= cutoff
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aDate = new Date(a.completedAt || a.startedAt);
      const bDate = new Date(b.completedAt || b.startedAt);
      
      switch (filters.sortBy) {
        case 'date_desc':
          return bDate - aDate;
        case 'date_asc':
          return aDate - bDate;
        case 'score_desc':
          return (b.score || 0) - (a.score || 0);
        case 'score_asc':
          return (a.score || 0) - (b.score || 0);
        case 'course_name':
          return (a.courseTitle || '').localeCompare(b.courseTitle || '');
        default:
          return bDate - aDate;
      }
    });

    setFilteredHistory(filtered);
  }, [testHistory, filters]);

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      course: '',
      dateRange: '30',
      sortBy: 'date_desc'
    });
  }, []);

  // Handle test selection
  const handleTestSelect = useCallback((testId) => {
    setSelectedTests(prev => 
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  }, []);

  // View test result
  const viewTestResult = useCallback((testId) => {
    navigate(`app/test/${testId}/result`);
  }, [navigate]);

  // Get status badge
  const getStatusBadge = (status, score) => {
    const badges = {
      completed: {
        color: score >= 70 ? 'green' : 'red',
        text: score >= 70 ? 'Passed' : 'Failed',
        icon: score >= 70 ? CheckCircleIcon : XCircleIcon
      },
      abandoned: {
        color: 'gray',
        text: 'Abandoned',
        icon: ExclamationCircleIcon
      },
      in_progress: {
        color: 'blue',
        text: 'In Progress',
        icon: ClockIcon
      }
    };

    const badge = badges[status] || badges.completed;
    const Icon = badge.icon;

    return (
      <span className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        ${badge.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : ''}
        ${badge.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : ''}
        ${badge.color === 'gray' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' : ''}
        ${badge.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : ''}
      `}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Get unique courses for filter dropdown
  const uniqueCourses = [...new Set(testHistory.map(test => test.courseTitle))].filter(Boolean);

  if (loading && !testHistory.length) {
    return <Loading message="Loading your test history..." />;
  }

  return (
    <motion.div 
      className="max-w-6xl mx-auto p-6"
      variants={animations && !reducedMotion ? containerVariants : {}}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div 
        variants={animations && !reducedMotion ? itemVariants : {}}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Test History
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          Track your progress and review past test performances
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search by course name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                clearable
                onClear={() => handleFilterChange('search', '')}
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<FunnelIcon className="w-4 h-4" />}
                className="cursor-pointer"
              >
                Filters
                {Object.values(filters).some(v => v !== 'all' && v !== 'date_desc' && v !== '30' && v !== '') && (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${primaryColors.bg} text-white`}>
                    Active
                  </span>
                )}
              </Button>

              {selectedTests.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="cursor-pointer"
                >
                  Actions ({selectedTests.length})
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="abandoned">Abandoned</option>
                      <option value="in_progress">In Progress</option>
                    </select>
                  </div>

                  {/* Course Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Course
                    </label>
                    <select
                      value={filters.course}
                      onChange={(e) => handleFilterChange('course', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="">All Courses</option>
                      {uniqueCourses.map((course, index) => (
                        <option key={index} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 3 months</option>
                      <option value="all">All time</option>
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="date_desc">Date (Newest First)</option>
                      <option value="date_asc">Date (Oldest First)</option>
                      <option value="score_desc">Score (Highest First)</option>
                      <option value="score_asc">Score (Lowest First)</option>
                      <option value="course_name">Course Name</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="cursor-pointer"
                  >
                    Clear Filters
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Test History List */}
      {error ? (
        <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
          <Card className="p-8 text-center">
            <XCircleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              Error Loading Test History
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {error}
            </p>
            <Button
              onClick={() => getTestHistory()}
              className="cursor-pointer"
            >
              Try Again
            </Button>
          </Card>
        </motion.div>
      ) : filteredHistory.length === 0 ? (
        <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
          <Card className="p-8 text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
              No Tests Found
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {filters.search || filters.status !== 'all' || filters.course
                ? 'No tests match your current filters.'
                : 'You haven\'t taken any tests yet. Start learning!'
              }
            </p>
            {filters.search || filters.status !== 'all' || filters.course ? (
              <Button onClick={clearFilters} className="cursor-pointer">
                Clear Filters
              </Button>
            ) : (
              <Button onClick={() => navigate('/courses')} className="cursor-pointer">
                Browse Courses
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredHistory.map((test, index) => (
              <motion.div
                key={test._id}
                variants={animations && !reducedMotion ? itemVariants : {}}
                layout
                className="test-item"
              >
                <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(test._id)}
                        onChange={() => handleTestSelect(test._id)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />

                      {/* Test Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                            {test.courseTitle}
                          </h3>
                          {getStatusBadge(test.status, test.score)}
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-slate-400">
                          <div className="flex items-center">
                            <CalendarDaysIcon className="w-4 h-4 mr-1" />
                            {new Date(test.completedAt || test.startedAt).toLocaleDateString()}
                          </div>

                          {test.timeTaken && (
                            <div className="flex items-center">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {Math.floor(test.timeTaken / 60)}:{(test.timeTaken % 60).toString().padStart(2, '0')}
                            </div>
                          )}

                          <div className="flex items-center">
                            <ChartBarIcon className="w-4 h-4 mr-1" />
                            {test.totalQuestions} questions
                          </div>

                          {test.difficulty && (
                            <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${test.difficulty === 'Easy' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                : test.difficulty === 'Medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              }
                            `}>
                              {test.difficulty}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      {test.score !== undefined && (
                        <div className="text-center">
                          <div className={`
                            text-2xl font-bold
                            ${test.score >= 90 ? 'text-green-500' :
                              test.score >= 80 ? 'text-blue-500' :
                              test.score >= 70 ? 'text-yellow-500' :
                              test.score >= 60 ? 'text-orange-500' : 'text-red-500'
                            }
                          `}>
                            {test.score}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {test.correctAnswers}/{test.totalQuestions} correct
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewTestResult(test._id)}
                          leftIcon={<EyeIcon className="w-4 h-4" />}
                          className="cursor-pointer"
                        >
                          View Details
                        </Button>

                        {test.status === 'in_progress' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate(`app/test/${test.courseId}/active`)}
                            className="cursor-pointer"
                          >
                            Continue
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Incomplete Tests */}
                  {test.status === 'in_progress' && test.progress && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400 mb-2">
                        <span>Progress: {test.progress}%</span>
                        <span>{test.answeredQuestions || 0} of {test.totalQuestions} answered</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-full ${primaryColors.bg} rounded-full transition-all duration-300`}
                          style={{ width: `${test.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load More */}
          {filteredHistory.length >= 50 && (
            <motion.div 
              variants={animations && !reducedMotion ? itemVariants : {}}
              className="text-center pt-6"
            >
              <Button
                variant="secondary"
                onClick={() => {
                  // Load more tests
                  getTestHistory({
                    page: Math.ceil(filteredHistory.length / 50) + 1,
                    limit: 50,
                    sortBy: filters.sortBy
                  });
                }}
                loading={loading}
                className="cursor-pointer"
              >
                Load More Tests
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {filteredHistory.length > 0 && (
        <motion.div 
          variants={animations && !reducedMotion ? itemVariants : {}}
          className="mt-8"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Summary Statistics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                  {filteredHistory.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Total Tests
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 mb-1">
                  {filteredHistory.filter(test => test.status === 'completed' && test.score >= 70).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Tests Passed
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500 mb-1">
                  {filteredHistory.filter(test => test.score !== undefined).length > 0
                    ? Math.round(filteredHistory.filter(test => test.score !== undefined)
                        .reduce((acc, test) => acc + test.score, 0) / 
                        filteredHistory.filter(test => test.score !== undefined).length)
                    : 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Average Score
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500 mb-1">
                  {filteredHistory.filter(test => test.timeTaken).length > 0
                    ? Math.round(filteredHistory.filter(test => test.timeTaken)
                        .reduce((acc, test) => acc + test.timeTaken, 0) / 
                        filteredHistory.filter(test => test.timeTaken).length / 60)
                    : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Avg. Time (min)
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TestHistory;