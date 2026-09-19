/**
 * coordinates video processing service business logic, cache fallbacks, database reads, and reusable api side effects
 *
 * @file backend/services/videoprocessingservice.js
 * @module backend/services/videoprocessingservice
 * @exports service functions used by controllers and scheduled work
 */

class VideoProcessingService {
  constructor() {
    this.allowedDomains = [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "dailymotion.com",
      "wistia.com",
      "res.cloudinary.com",
    ];
  }

  isAllowedHost(hostname) {
    const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
    return this.allowedDomains.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  }

  // validate video url
  validateVideoUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:" && this.isAllowedHost(urlObj.hostname);
    } catch {
      return false;
    }
  }

  // extract platform from url
  extractPlatform(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase().replace(/^www\./, "");

      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        return "youtube";
      } else if (domain.includes("vimeo.com")) {
        return "vimeo";
      } else if (domain.includes("dailymotion.com")) {
        return "dailymotion";
      } else if (domain.includes("wistia.com")) {
        return "wistia";
      } else if (domain === "res.cloudinary.com" || domain.endsWith(".cloudinary.com")) {
        return "cloudinary";
      }
      return "other";
    } catch {
      return "unknown";
    }
  }
}

export default new VideoProcessingService();
