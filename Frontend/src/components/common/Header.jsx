import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  Menu,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
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

                  {/* mobile hamburger — only shown on sm/md when NOT authenticated
                      (authenticated users use the bottom nav + avatar dropdown) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-9 w-9"
                    onClick={() => setMobileMenuOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ─────────────────── Mobile full-screen menu (non-authenticated) ─────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && !isAuthenticated && (
          <>
            {/* backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* drawer */}
            <motion.div
              key="drawer"
              className="fixed inset-x-0 bottom-0 z-[70] bg-background rounded-t-3xl border-t border-border p-6 pb-10 lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  {contentSettings?.logo?.url ? (
                    <img
                      src={contentSettings.logo.url}
                      alt={contentSettings.siteName || "Logo"}
                      className="h-8 w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <span className="font-bold text-foreground">
                    {contentSettings?.siteName || "Vidhgrow"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <nav className="space-y-1 mb-6">
                {filteredLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(link.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex flex-col gap-3">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─────────────────── Mobile bottom floating nav (authenticated) ─────────────────── */}
      {isAuthenticated && (
        <>
          {/* spacer so content doesn't hide behind the nav */}
          <div className="h-20 lg:hidden" />

          <motion.nav
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden"
            initial={animations && !reducedMotion ? { y: 100, opacity: 0 } : {}}
            animate={animations && !reducedMotion ? { y: 0, opacity: 1 } : {}}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.3,
            }}
          >
            <div className="flex items-center gap-1 px-3 py-2 bg-background/90 backdrop-blur-xl rounded-2xl border border-border shadow-lg shadow-black/10">
              {filteredLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-xl transition-all duration-200 ${
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="bottom-nav-pill"
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <link.icon className="w-5 h-5 relative" />
                    <span className="text-[10px] font-medium relative leading-none">
                      {link.label}
                    </span>
                  </Link>
                );
              })}

              {/* profile link inside bottom nav */}
              <Link
                to="/profile"
                className={`relative flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-xl transition-all duration-200 ${
                  isActive("/profile")
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive("/profile") && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Avatar className="w-5 h-5 relative">
                  <AvatarFallback
                    className="text-[9px] font-bold text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium relative leading-none">
                  {user?.name?.split(" ")[0] || "Me"}
                </span>
              </Link>
            </div>
          </motion.nav>
        </>
      )}

      {/* bottom spacer for non-authenticated mobile so footer clears the hamburger area */}
      {!isAuthenticated && <div className="h-0 lg:hidden" />}
    </>
  );
};

export default Header;
