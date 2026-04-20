/**
 * usernames that cannot be registered
 * - reserved system routes
 * - offensive words
 * - brand names
 */
export const RESERVED_USERNAMES = new Set([
  // system routes
  "admin",
  "administrator",
  "admin1",
  "admin123",
  "admin_team",
  "adminpanel",
  "superadmin",
  "root",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "profile",
  "settings",
  "account",
  "accounts",
  "dashboard",
  "home",
  "index",
  "about",
  "contact",
  "help",
  "support",
  "faq",
  "terms",
  "privacy",
  "legal",
  "api",
  "v1",
  "v2",
  "static",
  "assets",
  "public",
  "private",
  "auth",
  "oauth",
  "callback",
  "webhooks",
  "notification",
  "notifications",
  "secure",
  "security",
  "password",
  "reset",
  "recover",
  "forgot",

  // education / platform routes
  "teacher",
  "teachers",
  "teacheradmin",
  "student",
  "students",
  "studentadmin",
  "course",
  "courses",
  "class",
  "classes",
  "exam",
  "exams",
  "test",
  "tests",

  // generic routing words
  "blog",
  "news",
  "feed",
  "rss",
  "site",
  "sitemap",
  "status",
  "report",
  "reports",
  "search",
  "explore",

  // brand / platform blocked
  "vidhgrow",
  "vidhgrow_official",
  "official",
  "system",
  "service",
  "services",
  "mod",
  "moderator",
  "staff",
  "team",
  "bot",
  "null",
  "undefined",

  // impersonation / authority
  "owner",
  "creator",
  "manager",
  "ceo",
  "cto",
  "founder",
  "developer",
  "dev",
  "support",
  "support_team",
  "helpdesk",
  "adminsupport",
  "sysadmin",

  // generic user-group words
  "anonymous",
  "anon",
  "guest",
  "member",
  "members",
  "everyone",
  "anyone",
  "user",
  "users",
  "publicuser",

  // common social slugs
  "follow",
  "followers",
  "following",
  "messages",
  "inbox",
  "chat",
  "message",
  "notification",
  "notifications",
  "comments",
  "likes",

  // external service terms
  "www",
  "mail",
  "email",
  "smtp",
  "imap",

  // mild offensive / prohibited (safe list, non-graphic)
  "hate",
  "hater",
  "abuse",
  "scam",
  "spammer",
  "spam",
  "fake",
  "fraud",
  "fraudster",
  "banned",
  "blocked",
  "toxic",
  "bully",
  "harass",
  "harasser",

  // profanity (non-graphic-safe)
  "fuck",
  "fck",
  "sh1t",
  "shit",
  "ass",
  "bitch",
  "bastard",

  // violence-related (no descriptions)
  "kill",
  "killer",
  "die",
  "death",

  // inappropriate content (safe-filter)
  "porn",
  "prn",
  "sex",
  "nude",
  "naked",
  "nsfw",
  "xxx",

  // impersonation/variants that users attempt
  "officialadmin",
  "realadmin",
  "officialteacher",
  "teacherteam",
  "admindev",
  "adminmod",
  "teamadmin",
]);

/**
 * check if a username is reserved or offensive
 * @param {string} username - the username to check
 * @returns {{ reserved: boolean, reason?: string }}
 */
export const checkReservedUsername = (username) => {
  if (!username) return { reserved: false };

  const lower = username.toLowerCase();

  if (RESERVED_USERNAMES.has(lower)) {
    return { reserved: true, reason: "This username is not available" };
  }

  // check if it contains any offensive words as substrings
  const offensiveWords = ["fuck", "shit", "porn", "nude", "naked"];
  for (const word of offensiveWords) {
    if (lower.includes(word)) {
      return { reserved: true, reason: "Username contains disallowed words" };
    }
  }

  return { reserved: false };
};
