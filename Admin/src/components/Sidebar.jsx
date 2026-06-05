/**
 * renders the admin sidebar component with navigation, controls, user actions, and responsive states
 *
 * @file admin/src/components/sidebar.jsx
 * @module admin/src/components/sidebar
 * @exports component used by pages and shared layouts
 */

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Users,
  Plus,
  BarChart3,
  X,
  FileText,
  TicketPercent,
  ShieldAlert,
  Medal,
  GraduationCap,
  Newspaper
} from "lucide-react";
import { useContent } from "../contexts/ContentContext";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { contentSettings, fetchContentSettings } = useContent();
  const [logoBroken, setLogoBroken] = useState(false);
  const siteName = contentSettings?.siteName || "Vidhgrow";
  const logoUrl = contentSettings?.logo?.url;

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Categories",
      href: "/categories",
      icon: FolderOpen,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Courses",
      href: "/courses",
      icon: BookOpen,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Create Course",
      href: "/courses/create",
      icon: Plus,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "User Stats",
      href: "/user-stats",
      icon: BarChart3,
      color: "from-blue-500 to-blue-600",
    },

    {
      name: "User Management",
      href: "/users",
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      name: "Content",
      href: "/content",
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      name: "Blogs",
      href: "/blogs",
      icon: Newspaper,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Coupons",
      href: "/coupons",
      icon: TicketPercent,
      color: "from-indigo-500 to-indigo-600",
    },
    {
      href: "/violations",
      name: "Security Violations",
      icon: ShieldAlert,
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/leaderboard",
      name: "Global Leaderboard",
      icon: Medal,
      color: "from-blue-500 to-blue-600",
    },
    {
      href: "/admin/teachers",
      name: "Teachers",
      icon: GraduationCap,
      color: "from-blue-500 to-blue-600",
    }
  ];

  useEffect(() => {
    if (!contentSettings) {
      fetchContentSettings();
    }
  }, []);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  // close sidebar when route s on mobile
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* mobile backdrop with blur effect */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-[60] md:hidden"
          onClick={onClose}
        />
      )}

      {/* sidebar */}
      <div
        className={`
        fixed md:static inset-y-0 left-0 z-[70] md:z-auto
        transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0
        transition-transform duration-150 ease-out md:transition-none
        flex md:flex-shrink-0
      `}
      >
        <div className="flex flex-col w-64 sm:w-72 lg:w-80">
          <div className="flex flex-col flex-grow h-screen pt-4 sm:pt-5 pb-4 bg-white/95 backdrop-blur-sm border-r border-gray-200/80 shadow-lg md:shadow-sm">
            {/* header with enhanced styling */}
            <div className="flex items-center justify-between flex-shrink-0 px-4 sm:px-6 mb-2">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50">
                  {logoUrl && !logoBroken ? (
                    <img
                      src={logoUrl}
                      alt={siteName}
                      className="max-h-9 max-w-9 object-contain"
                      onError={() => setLogoBroken(true)}
                    />
                  ) : (
                    <span className="text-sm font-bold text-blue-700">
                      {siteName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 break-words">
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {siteName}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium truncate">
                    Admin Panel
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-colors duration-150 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* navigation with enhanced styling and proper scrolling */}
            <div className="mt-6 flex-grow flex flex-col min-h-0">
              <nav className="flex-1 px-3 sm:px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {navigation.map((item) => {
                  const isActive =
                    location.pathname === item.href ||
                    (item.href === "/courses" &&
                      location.pathname.startsWith("/courses"));

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-2xl
                        transition-colors duration-150 ease-out
                        ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute inset-0 rounded-2xl bg-blue-500/5" />
                      )}

                      {/* icon with enhanced styling */}
                      <div
                        className={`
                        relative mr-3 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                        transition-colors duration-150
                        ${
                          isActive
                            ? "bg-blue-500 text-white"
                            : "text-gray-400 group-hover:text-gray-600 group-hover:bg-gray-100"
                        }
                      `}
                      >
                        <item.icon
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          aria-hidden="true"
                        />
                      </div>

                      <span className="truncate relative z-10">
                        {item.name}
                      </span>

                      {isActive && (
                        <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* custom scrollbar styles using a style tag */}
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

export default Sidebar;
