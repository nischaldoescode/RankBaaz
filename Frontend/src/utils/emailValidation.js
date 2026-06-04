/**
 * keeps student email checks aligned with backend registration rules.
 */
const allowedStudentEmailDomains = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "zoho.com",
  "aol.com",
]);

export const validateStudentEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();

  if (!email) {
    return { valid: false, message: "Enter your email address" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, message: "Enter a valid email address" };
  }

  const [localPart, domain] = email.split("@");

  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return { valid: false, message: "Enter a valid email address" };
  }

  if (!allowedStudentEmailDomains.has(domain)) {
    return {
      valid: false,
      message: "Use a valid email provider like Gmail, Yahoo, Outlook, iCloud, ProtonMail, Zoho, or AOL.",
    };
  }

  return { valid: true, email };
};
