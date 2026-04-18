import Course from "../Models/Course.js";

/**
 * resolve country from ip address using ip-api.com
 */
const resolveCountry = async (ip) => {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.")) {
    return null; // local — no restriction
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    if (data.status !== "success") return null;
    // IN = india, NP = nepal
    if (data.countryCode === "IN") return "india";
    if (data.countryCode === "NP") return "nepal";
    return "other";
  } catch {
    return null; // fail open
  }
};

/**
 * attach resolved country to req — used by course access handlers
 */
export const attachUserCountry = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip;

  req.userCountry = await resolveCountry(ip);
  next();
};

/**
 * filter courses list to remove geo-restricted ones the user can't access
 */
export const filterGeoRestrictedCourses = (courses, userCountry) => {
  if (!userCountry || userCountry === null) return courses; // unknown ip = show all

  return courses.filter((course) => {
    if (!course.geoRestriction) return true; // no restriction
    if (!course.isPaid) return true; // free courses always visible
    return course.geoRestriction === userCountry;
  });
};

/**
 * middleware to block access if course is geo-restricted
 */
export const checkGeoAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (!courseId) return next();

    const course = await Course.findById(courseId).select("geoRestriction isPaid").lean();
    if (!course || !course.geoRestriction || !course.isPaid) return next();

    if (!req.userCountry) return next(); // unknown ip = allow

    if (req.userCountry === "other") {
      return res.status(403).json({
        success: false,
        code: "GEO_RESTRICTED",
        message: "This course is not available in your region",
      });
    }

    if (course.geoRestriction !== req.userCountry) {
      return res.status(403).json({
        success: false,
        code: "GEO_RESTRICTED",
        message: `This course is only available in ${course.geoRestriction === "india" ? "India" : "Nepal"}`,
      });
    }

    next();
  } catch (error) {
    console.error("Geo access check error:", error);
    next();
  }
};