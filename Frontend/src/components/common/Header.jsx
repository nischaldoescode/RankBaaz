/**
 * renders the shared header component used across public pages and app level flows
 *
 * @file frontend/src/components/common/header.jsx
 * @module frontend/src/components/common/header
 * @exports component used by pages and shared layouts
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  Home,
  BookOpen,
  FileText,
  Phone,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useContent } from "../../context/ContentContext";
import CachedImage from "./CachedImage";

const navLinks = [
  { path: "/", label: "Home", icon: Home, protected: false },
  { path: "/courses", label: "Courses", icon: BookOpen, protected: false },
  {
    href: "https://blogs.vidhgrow.online",
    label: "Blog",
    external: true,
  },
  { path: "/privacy", label: "Privacy", icon: FileText, protected: false },
  { path: "/contact", label: "Contact", icon: Phone, protected: false },
];

const avatarColors = {
  A: "#3b82f6",
  B: "#8b5cf6",
  C: "#ec4899",
  D: "#f59e0b",
  E: "#10b981",
  F: "#6366f1",
  G: "#14b8a6",
  H: "#f43f5e",
  I: "#8b5cf6",
  J: "#06b6d4",
  K: "#84cc16",
  L: "#f97316",
  M: "#a855f7",
  N: "#22c55e",
  O: "#eab308",
  P: "#ef4444",
  Q: "#06b6d4",
  R: "#8b5cf6",
  S: "#14b8a6",
  T: "#f59e0b",
  U: "#3b82f6",
  V: "#ec4899",
  W: "#10b981",
  X: "#6366f1",
  Y: "#f43f5e",
  Z: "#84cc16",
};

const navPillTransition = { type: "tween", duration: 0.14, ease: "easeOut" };
const navEntranceTransition = { type: "tween", duration: 0.2, ease: "easeOut" };

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { theme, setTheme, animations, reducedMotion } = useTheme();
  const { contentSettings } = useContent();
  const location = useLocation();
  const navigate = useNavigate();
  const siteName = contentSettings?.siteName || "Vidhgrow";
  const logoUrl = contentSettings?.logo?.url;

  const initial = user?.username?.charAt(0).toUpperCase() || "U";
  const avatarColor = avatarColors[initial] || avatarColors.A;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const filteredLinks = navLinks.filter((l) => !l.protected || isAuthenticated);
  const isDarkMode = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const DesktopNavLink = ({ link }) => {
    const active = !link.external && isActive(link.path);
    const className = `relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${
      active
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-blue-50 dark:hover:bg-white/[0.07]"
    }`;
    const label = <span className="relative z-10">{link.label}</span>;

    if (link.external) {
      return (
        <a href={link.href} className={className}>
          {label}
        </a>
      );
    }

    return (
      <Link to={link.path} className={className}>
        {active && (
          <motion.span
            layoutId="desktop-nav-fill"
            className="absolute inset-0 rounded-full bg-primary/10"
            transition={navPillTransition}
          />
        )}
        {label}
      </Link>
    );
  };
  return (
    <>
      {/* desktop and tablet header */}
      <motion.header
        className={`sticky top-0 z-50 w-full transition-all duration-150 border-b ${
          scrolled
            ? "bg-background/95 backdrop-blur-lg shadow-sm border-border"
            : "bg-background/80 backdrop-blur-sm border-transparent"
        }`}
        initial={animations && !reducedMotion ? { y: -80 } : {}}
        animate={animations && !reducedMotion ? { y: 0 } : {}}
        transition={navEntranceTransition}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* logo */}
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              {logoUrl ? (
                <CachedImage
                  src={logoUrl}
                  alt={siteName}
                  className="h-8 max-w-[112px] rounded-lg object-contain sm:h-10 sm:max-w-[156px]"
                  fallback={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10">
                      {siteName.charAt(0).toUpperCase()}
                    </span>
                  }
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary sm:h-10 sm:w-10">
                  {siteName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-[118px] truncate text-base font-bold text-foreground sm:block md:max-w-[180px]">
                {siteName}
              </span>
            </Link>

            {/* desktop nav links */}
            <nav className="hidden lg:flex items-center gap-1">
              {filteredLinks.map((link) => (
                <DesktopNavLink key={link.path || link.href} link={link} />
              ))}
            </nav>

            {/* right side */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 border border-blue-100/70 bg-white/70 text-slate-700 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={isDarkMode ? "Light mode" : "Dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2 h-9"
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback
                          className="text-xs font-bold text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:block text-sm font-medium max-w-24 truncate">
                        {user?.name}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 hidden lg:block text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                    sideOffset={8}
                  >
                    <div className="px-2 py-1.5 text-sm font-semibold truncate">
                      {user?.name}
                    </div>
                    <div className="px-2 pb-1.5 text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile?tab=settings"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  {/* desktop auth buttons */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/register">Sign Up</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      <>

        <div className="vg-bottom-nav lg:hidden fixed bottom-2 left-3 right-3 z-50 flex justify-center pointer-events-none">
          <motion.nav
            className="pointer-events-auto grid w-full max-w-[430px] grid-cols-5 items-center gap-1 rounded-[28px] border border-blue-100/80 bg-white/88 px-2 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            initial={animations && !reducedMotion ? { y: 80, opacity: 0 } : {}}
            animate={animations && !reducedMotion ? { y: 0, opacity: 1 } : {}}
            transition={{ ...navEntranceTransition, delay: 0.08 }}
          >
            {[
              { path: "/", label: "Home", icon: Home },
              { path: "/courses", label: "Courses", icon: BookOpen },
              { path: "/privacy", label: "Privacy", icon: FileText },
              { path: "/contact", label: "Contact", icon: Phone },
            ].map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative flex min-w-0 flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-colors duration-150"
                >
                  {active && (
                    <motion.div
                      layoutId="bottomNavActive"
                      className="absolute inset-x-1 top-1 h-8 rounded-full bg-primary/10"
                      transition={navPillTransition}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    <link.icon
                      className={`w-[18px] h-[18px] transition-colors duration-150 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`max-w-full truncate text-[10px] font-semibold leading-none transition-colors duration-150 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </span>
                  </div>
                </Link>
              );
            })}

            {isAuthenticated ? (
              <Link
                to="/profile"
                className="relative flex min-w-0 flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-colors duration-150"
              >
                {isActive("/profile") && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-x-1 top-1 h-8 rounded-full bg-primary/10"
                    transition={navPillTransition}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <motion.div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                    whileTap={{ scale: 0.85 }}
                  >
                    {initial}
                  </motion.div>
                  <span
                    className={`max-w-full truncate text-[10px] font-semibold leading-none transition-colors duration-150 ${
                      isActive("/profile")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {user?.name?.split(" ")[0]?.slice(0, 5) || "Me"}
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                to="/login"
                className="relative flex min-w-0 flex-col items-center justify-center rounded-2xl px-2.5 py-2 transition-colors duration-150"
              >
                {isActive("/login") && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-x-1 top-1 h-8 rounded-full bg-primary/10"
                    transition={navPillTransition}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <User
                    className={`w-[18px] h-[18px] transition-colors duration-150 ${
                      isActive("/login")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`max-w-full truncate text-[10px] font-semibold leading-none transition-colors duration-150 ${
                      isActive("/login")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    Sign in
                  </span>
                </div>
              </Link>
            )}
          </motion.nav>
        </div>
      </>
    </>
  );
};

export default Header;
