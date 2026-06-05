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
    ];
  }

  // validate video url
  validateVideoUrl(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");
      return this.allowedDomains.some((allowed) => domain.includes(allowed));
    } catch {
      return false;
    }
  }

  // extract platform from url
  extractPlatform(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");

      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        return "youtube";
      } else if (domain.includes("vimeo.com")) {
        return "vimeo";
      } else if (domain.includes("dailymotion.com")) {
        return "dailymotion";
      } else if (domain.includes("wistia.com")) {
        return "wistia";
      }
      return "other";
    } catch {
      return "unknown";
    }
  }
}

export default new VideoProcessingService();