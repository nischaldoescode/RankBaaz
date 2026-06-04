/**
 * keeps the user manage ment page focused and readable.
 */
import React, { useState, useEffect } from "react";
import { useAdmin } from "../contexts/AdminContext";
import {
  Users,
  Search,
  Mail,
  Calendar,
  User as UserIcon,
  Award,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Shield,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

// reusable confirm dialog
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  danger = false,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle
            className={`w-6 h-6 ${danger ? "text-red-500" : "text-amber-500"}`}
          />
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium text-white cursor-pointer ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const { fetchAllUsers, searchUsers, getUserDetails, loading } = useAdmin();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // ip block state
  const [blockDialog, setBlockDialog] = useState({
    open: false,
    user: null,
    duration: "permanent",
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [pagination.currentPage, sortBy, sortOrder]);

  const loadUsers = async () => {
    const result = await fetchAllUsers(
      pagination.currentPage,
      20,
      sortBy,
      sortOrder,
    );
    if (result.success) {
      setUsers(result.data);
      setPagination(result.pagination);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) {
      toast.error("Please enter at least 2 characters to search");
      return;
    }
    const result = await searchUsers(searchQuery.trim());
    if (result.success) {
      setUsers(result.data);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalUsers: result.data.length,
      });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    loadUsers();
  };

  const handleViewUser = async (userId) => {
    const result = await getUserDetails(userId);
    if (result.success) {
      setSelectedUser(result.data);
      setShowUserModal(true);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleBlockIp = async () => {
    const { user, duration } = blockDialog;
    if (!user) return;
    setActionLoading(true);
    try {
      await axios.post(
        `${API_BASE}/admin/users/${user._id}/block-ip`,
        { duration, reason: "admin action via user management" },
        { withCredentials: true },
      );
      toast.success(
        `IP blocked ${duration === "permanent" ? "permanently" : `for ${duration}`}`,
      );
      setBlockDialog({ open: false, user: null, duration: "permanent" });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to block IP");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    const { user } = deleteDialog;
    if (!user) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API_BASE}/admin/users/${user._id}`, {
        withCredentials: true,
      });
      toast.success(`User ${user.name} deleted`);
      setDeleteDialog({ open: false, user: null });
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setPagination((prev) => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const durationOptions = [
    { label: "24 hours", value: "24h" },
    { label: "48 hours", value: "48h" },
    { label: "7 days", value: "7d" },
    { label: "Permanent", value: "permanent" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-600 text-lg">
              Manage and view all registered users
            </p>
          </div>
          <button
            onClick={() => window.open("/api/admin/users/export", "_blank")}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="font-medium">Export CSV</span>
          </button>
        </div>

        {/* search and filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or username..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Search
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Registration Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="points">Points</option>
            </select>
            <button
              type="button"
              onClick={toggleSortOrder}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {sortOrder === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>

        {/* stats */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {pagination.totalUsers}
                </p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter((u) => u.stats?.testsCompleted > 0).length}
                </p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.reduce((sum, u) => sum + (u.badges?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Badges</p>
              </div>
            </div>
          </div>
        </div>

        {/* users table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Registered Users
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg font-medium">
                No users found
              </p>
            </div>
          ) : (
            <>
              {/* desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Age
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tests
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last IP
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.age || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.stats?.testsCompleted || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {user.points || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-500">
                            {user.lastIp || "not available"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewUser(user._id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setBlockDialog({
                                  open: true,
                                  user,
                                  duration: "permanent",
                                })
                              }
                              className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                              title="Block IP"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteDialog({ open: true, user })
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* mobile cards */}
              <div className="md:hidden space-y-4 p-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewUser(user._id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setBlockDialog({
                              open: true,
                              user,
                              duration: "permanent",
                            })
                          }
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDialog({ open: true, user })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {user.email}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          Age: {user.age || "N/A"}
                        </span>
                        <span className="text-gray-600">
                          {user.gender || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(user.createdAt)}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-600">
                          Tests: {user.stats?.testsCompleted || 0}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {user.points || 0} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage - 1)
                      }
                      disabled={!pagination.hasPrevPage}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-gray-700">
                      {pagination.currentPage}
                    </span>
                    <button
                      onClick={() =>
                        handlePageChange(pagination.currentPage + 1)
                      }
                      disabled={!pagination.hasNextPage}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* user details modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
              >
                <span className="text-2xl text-gray-600">x</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: UserIcon,
                    label: "Name",
                    value: selectedUser.user.name,
                  },
                  {
                    icon: Mail,
                    label: "Email",
                    value: selectedUser.user.email,
                  },
                  {
                    icon: Calendar,
                    label: "Age",
                    value: selectedUser.user.age || "N/A",
                  },
                  {
                    icon: UserIcon,
                    label: "Gender",
                    value: selectedUser.user.gender || "N/A",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="font-medium text-gray-900">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ip information panel */}
              <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Network Info
                </p>

                {/* ip ress row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs text-gray-500">Last Known IP</p>
                    <p className="font-mono text-sm font-medium text-gray-900">
                      {selectedUser.user.lastIp || "Not recorded"}
                    </p>
                  </div>
                  {selectedUser.ipBlock?.blocked && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                      IP Blocked
                      {selectedUser.ipBlock.expiresAt
                        ? ` until ${new Date(selectedUser.ipBlock.expiresAt).toLocaleDateString()}`
                        : " (permanent)"}
                    </span>
                  )}
                </div>

                {selectedUser.ipInfo ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Country</p>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {selectedUser.ipInfo.countryCode && (
                          <img
                            src={`https://flagcdn.com/16x12/${selectedUser.ipInfo.countryCode.toLowerCase()}.png`}
                            alt=""
                            className="inline-block"
                          />
                        )}
                        {selectedUser.ipInfo.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">ISP / Org</p>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                        {selectedUser.ipInfo.org}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">
                        VPN / Proxy / Hosting
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          selectedUser.ipInfo.isVpn
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {selectedUser.ipInfo.isVpn
                          ? "Detected"
                          : "Not detected"}
                      </span>
                    </div>
                  </div>
                ) : selectedUser.user.lastIp ? (
                  <p className="text-xs text-gray-400">
                    Geolocation unavailable
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    User has not logged in yet
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Tests",
                    value: selectedUser.user.stats?.testsCompleted || 0,
                    color: "blue",
                  },
                  {
                    label: "Points",
                    value: selectedUser.user.points || 0,
                    color: "green",
                  },
                  {
                    label: "Badges",
                    value: selectedUser.user.badges?.length || 0,
                    color: "purple",
                  },
                  {
                    label: "Questions",
                    value: selectedUser.user.stats?.questionsAnswered || 0,
                    color: "orange",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`text-center p-4 bg-${s.color}-50 rounded-lg`}
                  >
                    <p className={`text-2xl font-bold text-${s.color}-600`}>
                      {s.value}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {selectedUser.recentTests &&
                selectedUser.recentTests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Tests
                    </h3>
                    <div className="space-y-3">
                      {selectedUser.recentTests.map((test, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {test.courseName || "Unknown Course"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(test.completedAt || test.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${test.percentage >= 70 ? "text-green-600" : "text-red-600"}`}
                            >
                              {test.percentage}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {test.pointsEarned || 0} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* block ip dialog */}
      {blockDialog.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-gray-900">Block User IP</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Block IP address for{" "}
              <span className="font-semibold">{blockDialog.user?.name}</span>.
              Select duration:
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setBlockDialog((prev) => ({ ...prev, duration: opt.value }))
                  }
                  className={`py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors cursor-pointer ${
                    blockDialog.duration === opt.value
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setBlockDialog({
                    open: false,
                    user: null,
                    duration: "permanent",
                  })
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockIp}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Blocking..." : "Block IP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        title="Delete User"
        message={`Permanently delete ${deleteDialog.user?.name} and all their test results? This action cannot be undone.`}
        confirmLabel={actionLoading ? "Deleting..." : "Delete"}
        danger
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteDialog({ open: false, user: null })}
      />
    </div>
  );
};

export default UserManagement;
