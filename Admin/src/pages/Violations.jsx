/**
 * keeps the violations page focused and readable.
 */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiShield,
  FiUser,
  FiClock,
  FiX,
  FiCheck,
  FiEye,
  FiXCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";

const BlockedIpsList = () => {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    fetchBlocked();
  }, []);

  const fetchBlocked = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/ip/blocked", {
        withCredentials: true,
      });
      setBlocked(res.data.data.blocked || []);
    } catch (err) {
      console.error("Failed to fetch blocked IPs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (ip) => {
    setUnblocking(ip);
    try {
      await axios.post(
        "/api/admin/ip/unblock",
        { ip },
        { withCredentials: true },
      );
      toast.success(`IP ${ip} unblocked`);
      setBlocked((prev) => prev.filter((b) => b.ip !== ip));
    } catch (err) {
      toast.error("Failed to unblock IP");
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FiShield className="w-5 h-5 text-purple-600" />
          Blocked IP Addresses
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No blocked IPs</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blocked.map((b) => (
                <tr key={b.ip} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">
                    {b.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {b.userId ? (
                      <div>
                        <p className="font-medium">{b.userId.name}</p>
                        <p className="text-xs text-gray-500">
                          {b.userId.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">unknown</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {b.reason}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {b.expiresAt ? (
                      <span className="text-amber-600 font-medium">
                        {new Date(b.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                        Permanent
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleUnblock(b.ip)}
                      disabled={unblocking === b.ip}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FiCheck className="w-4 h-4" />
                      {unblocking === b.ip ? "Unblocking..." : "Unblock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Violations = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);

  useEffect(() => {
    fetchViolationStats();
  }, []);

  const fetchViolationStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/devtools/admin/stats");
      setStats(response.data.data);
    } catch (error) {
      console.error("Failed to fetch violation stats:", error);
      toast.error("Failed to load violation statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, courseId, reason) => {
    try {
      await axios.post("/devtools/admin/ban", {
        userId,
        courseId,
        reason,
        permanent: true,
      });

      toast.success("User banned successfully");
      fetchViolationStats();
      setShowBanModal(false);
    } catch (error) {
      console.error("Failed to ban user:", error);
      toast.error("Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId, courseId) => {
    try {
      await axios.post("/devtools/admin/unban", {
        userId,
        courseId,
      });

      toast.success("User unbanned successfully");
      fetchViolationStats();
    } catch (error) {
      console.error("Failed to unban user:", error);
      toast.error("Failed to unban user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-200 border-t-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 p-6">
      {/* header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-red-100 rounded-lg">
            <FiShield className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Security Violations
            </h1>
            <p className="text-gray-600">
              Monitor and manage DevTools detection violations
            </p>
          </div>
        </div>
      </div>
      {/* stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Total Violators",
            value: stats.totalViolators,
            icon: FiUser,
            color: "orange",
          },
          {
            label: "Total Violations",
            value: stats.totalViolations,
            icon: FiAlertTriangle,
            color: "red",
          },
          {
            label: "Banned Users",
            value: stats.totalBannedUsers,
            icon: FiXCircle,
            color: "purple",
          },
          {
            label: "Recent (24h)",
            value: stats.recentViolations.filter(
              (v) =>
                new Date(v.lastViolation) > Date.now() - 24 * 60 * 60 * 1000,
            ).length,
            icon: FiClock,
            color: "blue",
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>{" "}
      {/* recent violations table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiAlertTriangle className="w-5 h-5 text-red-600" />
            Recent Violations
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Violations
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Last Violation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Banned Courses
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.recentViolations.map((user, idx) => (
                <tr
                  key={user.userId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        user.violationCount >= 1
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.violationCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.lastViolation).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      {user.bannedCoursesCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <FiEye className="w-4 h-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* blocked ips section */}
      <BlockedIpsList />
      {/* user details modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBan={handleBanUser}
          onUnban={handleUnbanUser}
        />
      )}
    </div>
  );
};

// user details modal component
const UserDetailsModal = ({ user, onClose, onBan, onUnban }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserDetails();
  }, [user.userId]);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(`/admin/users/${user.userId}`);
      setUserDetails(response.data.data);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      toast.error("Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">
              @{user.username} • {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-200 border-t-red-600"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* violation stats */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                <FiAlertTriangle className="w-5 h-5" />
                Violation Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-red-700 mb-1">Total Violations</p>
                  <p className="text-2xl font-bold text-red-900">
                    {userDetails.user.devToolsViolations?.count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-red-700 mb-1">Last Violation</p>
                  <p className="text-sm font-semibold text-red-900">
                    {userDetails.user.devToolsViolations?.lastViolation
                      ? new Date(
                          userDetails.user.devToolsViolations.lastViolation,
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* violation details */}
            {userDetails.user.devToolsViolations?.violationDetails?.length >
              0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Violation History
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {userDetails.user.devToolsViolations.violationDetails.map(
                    (violation, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-900">
                            {violation.courseName}
                          </p>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            {violation.detectionMethod}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(violation.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          IP: {violation.ipAddress}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* banned courses */}
            {userDetails.user.bannedCourses?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Banned Courses
                </h3>
                <div className="space-y-3">
                  {userDetails.user.bannedCourses.map((ban, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {ban.courseName}
                        </p>
                        <p className="text-sm text-gray-600">{ban.reason}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Banned: {new Date(ban.bannedAt).toLocaleString()}
                          {ban.permanent && " (Permanent)"}
                        </p>
                      </div>
                      <button
                        onClick={() => onUnban(user.userId, ban.courseId)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <FiCheck className="w-4 h-4" />
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* recent test activity */}
            {userDetails.recentTests?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Recent Test Activity
                </h3>
                <div className="space-y-2">
                  {userDetails.recentTests.slice(0, 5).map((test, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {test.courseName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {Array.isArray(test.difficulty)
                            ? test.difficulty.join(", ")
                            : test.difficulty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {test.percentage}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(test.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Violations;
