/**
 * keeps the navbar component focused and readable.
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const NOTIFICATION_STORAGE_KEY = "vidhgrow-admin-notifications";

const operationMessages = {
  createCategory: ["success", "Category created", "A new category was added."],
  updateCategory: ["info", "Category updated", "Category details were saved."],
  deleteCategory: ["success", "Category deleted", "The category was removed."],
  createCourse: ["success", "Course created", "A new course was created."],
  updateCourse: ["info", "Course updated", "Course changes were saved."],
  deleteCourse: ["success", "Course deleted", "The course was removed."],
  createQuestion: ["success", "Question added", "A question was added to the course."],
  updateQuestion: ["info", "Question updated", "Question changes were saved."],
  deleteQuestion: ["success", "Question deleted", "The question was removed."],
  publishBlog: ["success", "Blog published", "The blog post is live on the blogs site."],
  saveBlogDraft: ["info", "Draft saved", "The blog draft was saved."],
  deleteBlog: ["success", "Blog deleted", "The blog post and related comments were removed."],
  createBlogAuthor: ["success", "Author created", "A blog author profile was added."],
  updateBlogAuthor: ["info", "Author updated", "The blog author profile was saved."],
  deleteBlogAuthor: ["success", "Author deleted", "The blog author was removed."],
  submitIndexNow: ["info", "IndexNow submitted", "Fresh blog URLs were sent for indexing."],
  ProfileUpdate: ["info", "Profile updated", "Your admin profile was saved."],
  PasswordChange: ["info", "Password changed", "Your password was updated."],
};

const formatNotificationTime = (createdAt) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return new Date(createdAt).toLocaleDateString();
};

const Navbar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // add an admin activity notification
  const addNotification = (type, title, message) => {
    const createdAt = new Date().toISOString();
    const notification = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      message,
      createdAt,
      read: false,
      type,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 30));
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved).slice(0, 30));
      }
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((notification) => !notification.read).length);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.slice(0, 30)));
  }, [notifications]);

  useEffect(() => {
    // create a custom event listener for admin operations
    const handleAdminOperation = (event) => {
      const { operation, success, data } = event.detail;

      if (success) {
        const [notificationType, title, fallbackMessage] =
          operationMessages[operation] || ["success", "Activity complete", "The action finished successfully."];
        addNotification(
          notificationType,
          title,
          data?.title ? `${data.title}: ${fallbackMessage}` : data?.message || fallbackMessage,
        );
      } else {
        addNotification(
          "error",
          operationMessages[operation]?.[1] || "Operation failed",
          data?.message || "An error occurred. Please try again."
        );
      }
    };

    // event listener
    window.addEventListener("adminOperation", handleAdminOperation);

    return () => {
      window.removeEventListener("adminOperation", handleAdminOperation);
    };
  }, []);

  // mark notification as read
  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  // delete notification
  const deleteNotification = (notificationId) => {
    const deletedNotif = notifications.find((n) => n.id === notificationId);
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId)
    );
    if (deletedNotif && !deletedNotif.read) {
    }
  };

  // mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  // close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  const getNotificationIcon = (type) => {
    const color =
      type === "error" ? "#dc2626" : type === "success" ? "#2563eb" : "#0ea5e9";

    return (
      <span
        aria-hidden="true"
        className="mt-1 block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  };

  // close all dropdowns
  const closeAllDropdowns = () => {
    setDropdownOpen(false);
    setNotificationOpen(false);
  };

  return (
    <>
      {/* mobile backdrop - only show when dropdowns are open on mobile */}
      {(dropdownOpen || notificationOpen) && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg md:hidden"
          style={{ zIndex: 45 }}
          onClick={closeAllDropdowns}
        />
      )}

      <header
        className="sticky top-0 w-full bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/60"
        style={{ zIndex: 50 }}
      >
        <div className="flex h-12 sm:h-14 md:h-16 items-center w-full">
          {/* mobile menu button */}
          <button
            type="button"
            className="flex items-center justify-center w-12 sm:w-14 h-full border-r border-gray-200/60 text-gray-600 hover:text-gray-900 hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden transition-all duration-200 active:scale-95"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200" />
            ) : (
              <Menu className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200" />
            )}
          </button>

          <div className="flex-1 flex justify-between items-center px-2 sm:px-4 lg:px-6 w-full">
            {/* left side - title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xs sm:text-sm md:text-lg lg:text-xl font-semibold text-gray-900 truncate">
                Admin Dashboard
              </h1>
            </div>

            {/* right side - actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  className="relative p-2 sm:p-2.5 md:p-3 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 active:scale-95 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationOpen(!notificationOpen);
                    if (dropdownOpen) setDropdownOpen(false);
                  }}
                  aria-label="View notifications"
                >
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* notifications dropdown */}
                {notificationOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 lg:w-[420px] bg-white rounded-xl shadow-2xl border border-gray-200/60 py-2 transform transition-all duration-200 ease-out max-h-[80vh] flex flex-col"
                    style={{ zIndex: 60 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* notifications list with custom scrollbar */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No notifications yet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Notifications will appear here when you perform
                            actions
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 border-l-4 transition-colors group ${
                              notification.read
                                ? "border-l-transparent"
                                : "border-l-blue-500 bg-blue-50/30"
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <span className="text-lg flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium ${
                                    notification.read
                                      ? "text-gray-700"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatNotificationTime(notification.createdAt || Date.now())}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                                    title="Mark as read"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* footer */}
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifications([]);
                          }}
                          className="w-full text-center text-xs text-red-600 hover:text-red-700 font-medium py-1 transition-colors cursor-pointer"
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* profile dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="flex items-center max-w-xs bg-white rounded-lg hover:bg-gray-50/80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 p-1 active:scale-95 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDropdownOpen(!dropdownOpen);
                    if (notificationOpen) setNotificationOpen(false);
                  }}
                  aria-label="Open user menu"
                >
                  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="hidden sm:block ml-2 text-gray-700 text-sm font-medium max-w-[80px] lg:max-w-[120px] truncate">
                    {user?.name || "Admin"}
                  </span>
                  <svg
                    className={`hidden sm:block ml-1 h-3 w-3 lg:h-4 lg:w-4 text-gray-400 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 sm:w-64 rounded-xl shadow-2xl py-2 bg-white border border-gray-200/60 focus:outline-none transform transition-all duration-200 ease-out"
                    style={{ zIndex: 60 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* user info section */}
                    <div className="px-4 py-3 border-b border-gray-100 cursor-pointer">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1 cursor-pointer">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user?.name || "Admin User"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.email || "admin@example.com"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* menu items */}
                    <div className="py-1">
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 cursor-pointer"
                        onClick={() => {
                          navigate("/setting");
                          setDropdownOpen(false); // close the dropdown navigation
                        }}
                      >
                        <Settings className="mr-3 h-4 w-4 text-gray-400" />
                        <span>Settings</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 cursor-pointer"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* custom scrollbar styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
            background-color: rgb(209 213 219);
            border-radius: 0.5rem;
          }
          .scrollbar-track-gray-100::-webkit-scrollbar-track {
            background-color: rgb(243 244 246);
          }
          .hover\\:scrollbar-thumb-gray-400:hover::-webkit-scrollbar-thumb {
            background-color: rgb(156 163 175);
          }
        `,
        }}
      />
    </>
  );
};

export default Navbar;
