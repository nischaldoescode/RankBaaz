/**
 * keeps the global leader board page focused and readable.
 */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FiTrendingUp,
  FiAward,
  FiRefreshCw,
  FiDownload,
  FiFilter,
  FiUser,
  FiTarget,
} from "react-icons/fi";
import { motion } from "framer-motion";

const GlobalLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    limit: 100,
    sortBy: "points", // points, testscompleted, averagepercentile
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/profile/leaderboard/global", {
        params: { limit: filter.limit },
      });

      setLeaderboard(response.data.data.leaderboard);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
    toast.success("Leaderboard refreshed");
  };

  const handleExport = () => {
    const csvData = [
      ["Rank", "Name", "Username", "Points", "Tests Completed", "Average Percentile", "Badges"],
      ...leaderboard.map((user) => [
        user.rank,
        user.name || "Anonymous",
        user.username,
        user.points,
        user.testsCompleted,
        user.averagePercentile?.toFixed(1) || "0",
        user.badges?.length || 0,
      ]),
    ];

    const csv = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard-${Date.now()}.csv`;
    a.click();

    toast.success("Leaderboard exported");
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "from-yellow-400 to-yellow-600";
    if (rank === 2) return "from-gray-300 to-gray-500";
    if (rank === 3) return "from-orange-400 to-orange-600";
    return "from-blue-400 to-blue-600";
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) return "";
    if (rank <= 10) return "";
    if (rank <= 50) return "";
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      {/* header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
              <FiTrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Global Leaderboard
              </h1>
              <p className="text-gray-600">
                Top performers across all courses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <button
              onClick={handleExport}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <FiDownload className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FiFilter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Limit
            </label>
            <select
              value={filter.limit}
              onChange={(e) =>
                setFilter({ ...filter, limit: parseInt(e.target.value) })
              }
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Top 200</option>
              <option value={500}>Top 500</option>
            </select>
          </div>
        </div>
      </div>

      {/* top 3 podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {leaderboard.slice(0, 3).map((user, idx) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-gradient-to-br ${getRankColor(
              user.rank
            )} rounded-2xl shadow-2xl p-6 text-white ${
              user.rank === 1 ? "md:col-span-1 md:order-2 transform md:scale-110" : ""
            }`}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">{getRankIcon(user.rank)}</div>
              <div className="text-4xl font-bold mb-2">#{user.rank}</div>
              <h3 className="text-xl font-bold mb-1">{user.name || "Anonymous"}</h3>
              <p className="text-sm opacity-90 mb-4">@{user.username}</p>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Points:</span>
                  <span className="font-bold">{user.points?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tests:</span>
                  <span className="font-bold">{user.testsCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg:</span>
                  <span className="font-bold">
                    {user.averagePercentile?.toFixed(1) || "0"}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* full leaderboard table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900">Complete Rankings</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Points
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Tests
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Avg %
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Badges
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((user, idx) => (
                <tr
                  key={user.userId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getRankIcon(user.rank)}</span>
                      <span className="font-bold text-gray-900">
                        #{user.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.name || "Anonymous"}
                      </p>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-blue-600">
                      {user.points?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {user.testsCompleted}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-green-600">
                      {user.averagePercentile?.toFixed(1) || "0"}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {user.badges?.slice(0, 3).map((badge, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                          title={badge.type}
                        >

                        </span>
                      ))}
                      {user.badges?.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{user.badges.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GlobalLeaderboard;