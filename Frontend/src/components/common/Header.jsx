import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  GraduationCap,
  Home,
  BookOpen,
  FileText,
  Phone,
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

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const { contentSettings } = useContent();
  const location = useLocation();
  const navigate = useNavigate();

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

  // ── Desktop NavLink ──
  const DesktopNavLink = ({ link }) => (
    <Link
      to={link.path}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive(link.path)
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      {link.label}
      {isActive(link.path) && (
        <motion.span
          layoutId="desktop-indicator"
          className="absolute -bottom-[1px] left-2 right-2 h-[2px] bg-primary rounded-full"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  );

  return (
    <>
      {/* ─────────────────── Desktop / Tablet header (top) ─────────────────── */}
      <motion.header
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
          scrolled
            ? "bg-background/95 backdrop-blur-lg shadow-sm border-border"
            : "bg-background/80 backdrop-blur-sm border-transparent"
        }`}
        initial={animations && !reducedMotion ? { y: -80 } : {}}
        animate={animations && !reducedMotion ? { y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              {contentSettings?.logo?.url ? (
                <CachedImage
                  src={contentSettings.logo.url}
                  alt={contentSettings.siteName || "Logo"}
                  className="h-10 w-auto object-contain rounded-lg"
                  fallback={
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary-foreground" />
                    </div>
                  }
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <span className="hidden sm:block text-base font-bold text-foreground">
                {contentSettings?.siteName || "Vidhgrow"}
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-1">
              {filteredLinks.map((link) => (
                <DesktopNavLink key={link.path} link={link} />
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
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
        <div className="h-24 lg:hidden" />

        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <motion.nav
            className="pointer-events-auto flex items-center gap-0.5 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl px-1.5 py-1.5"
            initial={animations && !reducedMotion ? { y: 80, opacity: 0 } : {}}
            animate={animations && !reducedMotion ? { y: 0, opacity: 1 } : {}}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 28,
              delay: 0.2,
            }}
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
                  className="relative flex flex-col items-center justify-center px-3.5 py-2 rounded-xl transition-all min-w-[52px]"
                >
                  {active && (
                    <motion.div
                      layoutId="bottomNavActive"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-0.5">
                    <link.icon
                      className={`w-[18px] h-[18px] transition-colors duration-200 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-bold uppercase tracking-tight leading-none transition-colors duration-200 ${
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
                className="relative flex flex-col items-center justify-center px-3.5 py-2 rounded-xl transition-all min-w-[52px]"
              >
                {isActive("/profile") && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
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
                    className={`text-[9px] font-bold uppercase tracking-tight leading-none transition-colors duration-200 ${
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
                className="relative flex flex-col items-center justify-center px-3.5 py-2 rounded-xl transition-all min-w-[52px]"
              >
                {isActive("/login") && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <User
                    className={`w-[18px] h-[18px] transition-colors duration-200 ${
                      isActive("/login")
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-tight leading-none transition-colors duration-200 ${
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
