import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  ChevronDown,
  GraduationCap,
  Home,
  BookOpen,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
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

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isAuthenticated, user, logout } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const { contentSettings } = useContent();
  const location = useLocation();
  const navigate = useNavigate();

  const getAvatarColor = (initial) => {
    const colors = {
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

    const char = initial.charAt(0).toUpperCase();
    return colors[char] || colors.A;
  };
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleCloseMenu = () => {
    setIsMobileMenuOpen(false);
  };
  const handleLogout = async () => {
    handleCloseMenu();
    await logout();
    navigate("/");
  };

  const isActivePath = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    {
      path: "/",
      label: "Home",
      icon: Home,
      protected: false,
    },
    {
      path: "/courses",
      label: "Courses",
      icon: BookOpen,
      protected: false,
    },
    {
      path: "/privacy",
      label: "Privacy Policy",
      icon: FileText,
      protected: false,
    },
    {
      path: "/contact",
      label: "Contact",
      icon: User,
      protected: false,
    },
  ];

  const profileMenuItems = [
    { path: "/profile", label: "Profile", icon: User },
    { path: "/profile/settings", label: "Settings", icon: Settings },
  ];

  const getUserInitials = () => {
    if (!user?.username) return "U";
    return user.username.charAt(0).toUpperCase();
  };

  const NavLink = ({ link, onClick, className = "" }) => (
    <Link
      to={link.path}
      onClick={onClick}
      className={`
      group relative flex items-center gap-3 px-3 py-2.5 rounded-lg 
      font-medium transition-all duration-200 
      ${
        isActivePath(link.path)
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      } ${className}
    `}
    >
      <link.icon className="w-4 h-4 flex-shrink-0" />
      <span className="relative">
        {link.label}
        {/* Underline active indicator */}
        {isActivePath(link.path) && (
          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </span>
    </Link>
  );

  return (
    <motion.header
      className={`
        sticky top-0 z-50 w-full transition-all duration-300 border-b
        ${
          scrolled
            ? "bg-background/95 backdrop-blur-lg shadow-sm border-border"
            : "bg-background/80 backdrop-blur-sm border-transparent"
        }
      `}
      initial={animations && !reducedMotion ? { y: -100 } : {}}
      animate={animations && !reducedMotion ? { y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {contentSettings?.logo?.url ? (
              <img
                src={contentSettings.logo.url}
                alt={contentSettings.siteName || "Logo"}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">
                {contentSettings?.siteName || "TestMaster Pro"}
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map((link) => {
              if (link.protected && !isAuthenticated) return null;
              return <NavLink key={link.path} link={link} />;
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* User Avatar Dropdown - Shows on ALL screen sizes */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 px-2 h-10"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{
                            backgroundColor: getAvatarColor(getUserInitials()),
                          }}
                        >
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden lg:block max-w-24 truncate">
                        {user?.name}
                      </span>
                      <ChevronDown className="w-4 h-4 hidden lg:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48"
                    sideOffset={8}
                    alignOffset={-4}
                  >
                    <div className="px-2 py-1.5 text-sm font-semibold">
                      {user?.name}
                    </div>
                    <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile?tab=settings"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Hamburger Menu - Navigation Only */}
                <Sheet
                  open={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden h-10 w-10"
                    >
                      <Menu className="w-5 h-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-80 px-0"
                    aria-describedby={undefined}
                  >
                    {/* Mobile menu content - REMOVE user info section */}
                    <AnimatePresence mode="wait">
                      {isMobileMenuOpen && (
                        <motion.div
                          initial={{ x: "100%" }}
                          animate={{ x: 0 }}
                          exit={{ x: "100%" }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          className="h-full"
                        >
                          <SheetHeader className="px-6 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                              {contentSettings?.logo?.url ? (
                                <img
                                  src={contentSettings.logo.url}
                                  alt={contentSettings.siteName || "Logo"}
                                  className="h-8 w-auto object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                  <GraduationCap className="w-5 h-5 text-primary-foreground" />
                                </div>
                              )}
                              <SheetTitle className="text-lg">
                                {contentSettings?.siteName || "TestMaster Pro"}
                              </SheetTitle>
                            </div>
                          </SheetHeader>

                          <div className="flex flex-col h-full">
                            {/* Navigation Links - Remove User Info section completely */}
                            <div className="flex-1 p-6">
                              <nav className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                  Navigation
                                </h3>
                                {navLinks.map((link) => {
                                  if (link.protected && !isAuthenticated)
                                    return null;
                                  return (
                                    <NavLink
                                      key={link.path}
                                      link={link}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full"
                                    />
                                  );
                                })}
                              </nav>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                {/* Non-authenticated Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2">
                  <Button variant="ghost" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/register">Sign Up</Link>
                  </Button>
                </div>

                {/* Mobile Menu for Non-authenticated */}
                <Sheet
                  open={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden h-10 w-10"
                    >
                      <Menu className="w-5 h-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-80 px-0"
                    aria-describedby={undefined}
                  >
                    <AnimatePresence mode="wait">
                      {isMobileMenuOpen && (
                        <motion.div
                          initial={{ x: "100%" }}
                          animate={{ x: 0 }}
                          exit={{ x: "100%" }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                          className="h-full"
                        >
                          <SheetHeader className="px-6 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <SheetTitle className="text-lg">
                                {contentSettings?.siteName || "RankBaaz"}
                              </SheetTitle>
                            </div>
                          </SheetHeader>

                          <div className="flex flex-col h-full">
                            {/* Navigation Links */}
                            <div className="flex-1 p-6">
                              <nav className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                  Navigation
                                </h3>
                                {navLinks.map((link) => {
                                  if (link.protected && !isAuthenticated)
                                    return null;
                                  return (
                                    <NavLink
                                      key={link.path}
                                      link={link}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="w-full"
                                    />
                                  );
                                })}
                              </nav>
                            </div>

                            {/* Auth Actions */}
                            <div className="p-6 border-t border-border space-y-3">
                              <Button
                                variant="outline"
                                className="w-full"
                                asChild
                              >
                                <Link
                                  to="/login"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  Sign In
                                </Link>
                              </Button>
                              <Button className="w-full" asChild>
                                <Link
                                  to="/register"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  Sign Up
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
