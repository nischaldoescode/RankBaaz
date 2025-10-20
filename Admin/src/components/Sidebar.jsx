import React, { useEffect } from "react";
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
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

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
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Courses",
      href: "/courses",
      icon: BookOpen,
      color: "from-green-500 to-green-600",
    },
    {
      name: "Create Course",
      href: "/courses/create",
      icon: Plus,
      color: "from-orange-500 to-orange-600",
    },
    {
      name: "User Stats",
      href: "/user-stats",
      icon: BarChart3,
      color: "from-red-500 to-red-600",
    },
    
    {
      name: "User Management",
      href: "/users",
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
    },
    { name: "Content", href: "/content" , icon: FileText, color: "from-indigo-500 to-indigo-600",},
        {
      name: "Coupons",
      href: "/coupons",
      icon: TicketPercent,
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
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
      {/* Mobile backdrop with blur effect */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed md:static inset-y-0 left-0 z-[70] md:z-auto
        transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0
        transition-transform duration-300 ease-out md:transition-none
        flex md:flex-shrink-0
      `}
      >
        <div className="flex flex-col w-64 sm:w-72 lg:w-80">
          <div className="flex flex-col flex-grow h-screen pt-4 sm:pt-5 pb-4 bg-white/95 backdrop-blur-md border-r border-gray-200/80 shadow-2xl md:shadow-lg">
            {/* Header with enhanced styling */}
            <div className="flex items-center justify-between flex-shrink-0 px-4 sm:px-6 mb-2">
              <div className="flex items-center">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-blue-100">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="ml-3">
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    TestApp
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Admin Panel
                  </p>
                </div>
              </div>

              {/* Enhanced mobile close button */}
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation with enhanced styling and proper scrolling */}
            <div className="mt-6 flex-grow flex flex-col min-h-0">
              <nav className="flex-1 px-3 sm:px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {navigation.map((item, index) => {
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
                        transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]
                        ${
                          isActive
                            ? "bg-gradient-to-r from-blue-50 via-blue-50 to-blue-100 text-blue-700 shadow-lg shadow-blue-100/50 border border-blue-200/50"
                            : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 hover:shadow-md"
                        }
                      `}
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {/* Background gradient for active state */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-blue-700/5 rounded-2xl" />
                      )}

                      {/* Icon with enhanced styling */}
                      <div
                        className={`
                        relative mr-3 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                        transition-all duration-300
                        ${
                          isActive
                            ? `bg-gradient-to-br ${item.color} text-white shadow-lg`
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

                      {/* Active indicator with pulse effect */}
                      {isActive && (
                        <>
                          <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-full" />
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Enhanced bottom section */}
              <div className="flex-shrink-0 border-t border-gray-200/80 p-4 sm:p-6 mt-6">
                <div className="relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center p-4 rounded-2xl bg-gradient-to-r from-gray-50/80 to-gray-100/80 border border-gray-200/60 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800">
                        Management
                      </p>
                      <p className="text-xs text-gray-500">Control Panel</p>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles using a style tag */}
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
