import React, { useMemo } from "react";
import { AlertCircle } from "lucide-react";

const VideoPlayer = ({ videoData, className = "" }) => {
  // Extract video ID from URL
  const extractVideoId = (url) => {
    if (!url) return null;

    // YouTube formats:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID

    let videoId = null;

    // Match youtube.com/watch?v=VIDEO_ID format
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      videoId = youtubeMatch[1];
    }

    return videoId;
  };

  // Get embed URL based on platform
  const embedUrl = useMemo(() => {
    if (!videoData || !videoData.url) return null;

    const platform = videoData.platform?.toLowerCase();

    if (platform === "youtube") {
      const videoId = extractVideoId(videoData.url);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&fs=1&cc_load_policy=0&iv_load_policy=3`;
      }
    } else if (platform === "vimeo") {
      // Extract Vimeo video ID
      const vimeoMatch = videoData.url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
    } else if (platform === "dailymotion") {
      // Extract Dailymotion video ID
      const dmMatch = videoData.url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9_-]+)/);
      if (dmMatch) {
        return `https://www.dailymotion.com/embed/video/${dmMatch[1]}`;
      }
    }

    // Fallback to original URL for other platforms
    return videoData.url;
  }, [videoData]);

  // Validation
  if (!videoData || !videoData.url) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No video available</p>
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Invalid video URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Video title and platform badge */}
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {videoData.title || "Video Lesson"}
        </h4>
        {videoData.platform && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 mt-2">
            {videoData.platform.charAt(0).toUpperCase() + videoData.platform.slice(1)}
          </span>
        )}
      </div>

      {/* Responsive iframe wrapper */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {/* paddingBottom: "56.25%" = 16:9 aspect ratio */}
        <iframe
          className="absolute inset-0 w-full h-full rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
          src={embedUrl}
          title={videoData.title || "Video Player"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Video description if available */}
      {videoData.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          {videoData.description}
        </p>
      )}
    </div>
  );
};

export default VideoPlayer;