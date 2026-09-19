/**
 * builds the public visual study board from approved learning media and published blog media
 *
 * @file backend/controllers/mediadashboardcontroller.js
 * @module backend/controllers/mediadashboardcontroller
 * @returns {object} media items prepared for safe public delivery
 */

import { v2 as cloudinary } from "cloudinary";
import Course from "../Models/Course.js";
import BlogPost from "../Models/BlogPost.js";

const MAX_ITEMS = 24;
const MAX_QUERY_LENGTH = 80;
const DEFAULT_COURSE_SUMMARY = "A teacher led course with structured practice";
const DEFAULT_BLOG_SUMMARY = "Notes on learning, teaching, and platform work";
const CLOUDINARY_DELIVERY_STEPS = [
  "automatic format negotiation",
  "automatic quality selection",
  "subject-aware gravity crop",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanQuery = (value) =>
  String(value || "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

const transformedImageUrl = (image) => {
  const publicId = String(image?.public_id || "").trim();
  if (publicId) {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: image?.resource_type === "video" ? "video" : "image",
      transformation: [
        {
          width: 720,
          height: 460,
          crop: "fill",
          gravity: "auto",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    });
  }

  const fallback = String(image?.url || "").trim();
  return /^https:\/\//i.test(fallback) ? fallback : "";
};

const getDeliveryProfile = (image) => {
  const managedByCloudinary = Boolean(String(image?.public_id || "").trim());

  return {
    provider: managedByCloudinary ? "Cloudinary" : "source record",
    managedByCloudinary,
    sourceLinked: true,
    responsive: managedByCloudinary,
    transformations: managedByCloudinary
      ? CLOUDINARY_DELIVERY_STEPS
      : ["secure source delivery"],
    destination: image?.resource_type === "video" ? "media player" : "responsive image",
  };
};

const toCourseItem = (course) => {
  const image = course.image || {};

  return {
    id: String(course._id),
    type: "course",
    title: course.name,
    summary: course.description || DEFAULT_COURSE_SUMMARY,
    href: "/courses",
    image: transformedImageUrl(image),
    alt: image.alt || `${course.name} course cover`,
    topic: course.category?.name || "course practice",
    updatedAt: course.updatedAt || course.createdAt || null,
    delivery: getDeliveryProfile(image),
  };
};

const toBlogItem = (post) => {
  const image = post.coverImage || {};

  return {
    id: String(post._id),
    type: "blog",
    title: post.title,
    summary: post.excerpt || post.plainTextPreview || DEFAULT_BLOG_SUMMARY,
    href: `https://blogs.vidhgrow.online/${encodeURIComponent(post.slug)}`,
    image: transformedImageUrl(image),
    alt: image.alt || `${post.title} cover`,
    topic: post.topics?.[0] || post.category || "platform notes",
    updatedAt: post.publishedAt || post.updatedAt || null,
    delivery: getDeliveryProfile(image),
  };
};

/**
 * returns bounded public media records for the visual study board
 *
 * @param {import("express").Request} req request with optional q, type, and limit query values
 * @param {import("express").Response} res response containing safe media records
 * @returns {Promise<void>} resolves after the response is sent
 */
export const getMediaDashboard = async (req, res) => {
  const query = cleanQuery(req.query.q);
  const requestedType = ["all", "course", "blog"].includes(req.query.type)
    ? req.query.type
    : "all";
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 12, 1),
    MAX_ITEMS,
  );
  const search = query ? new RegExp(escapeRegExp(query), "i") : null;

  const courseFilter = {
    isActive: true,
    $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }],
    $and: [
      {
        $or: [
          { "image.public_id": { $exists: true, $ne: "" } },
          { "image.url": { $exists: true, $ne: "" } },
        ],
      },
    ],
  };
  const blogFilter = {
    status: "published",
    $and: [
      {
        $or: [
          { "coverImage.public_id": { $exists: true, $ne: "" } },
          { "coverImage.url": { $exists: true, $ne: "" } },
        ],
      },
    ],
  };

  if (search) {
    courseFilter.$and = [
      ...courseFilter.$and,
      {
        $or: [{ name: search }, { description: search }],
      },
    ];
    blogFilter.$and = [
      ...blogFilter.$and,
      {
        $or: [{ title: search }, { excerpt: search }, { plainTextPreview: search }],
      },
    ];
  }

  try {
    const [courses, blogs] = await Promise.all([
      requestedType === "blog"
        ? []
        : Course.find(courseFilter)
            .select("name description image category createdAt updatedAt")
            .populate("category", "name")
            .sort({ updatedAt: -1 })
            .limit(limit)
            .lean(),
      requestedType === "course"
        ? []
        : BlogPost.find(blogFilter)
            .select("title slug excerpt plainTextPreview coverImage topics category publishedAt updatedAt")
            .sort({ publishedAt: -1, updatedAt: -1 })
            .limit(limit)
            .lean(),
    ]);

    const items = [...courses.map(toCourseItem), ...blogs.map(toBlogItem)]
      .filter((item) => item.image)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, limit);

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.status(200).json({
      success: true,
      data: {
        items,
        counts: {
          courses: items.filter((item) => item.type === "course").length,
          blogs: items.filter((item) => item.type === "blog").length,
          total: items.length,
          cloudinaryManaged: items.filter(
            (item) => item.delivery?.managedByCloudinary,
          ).length,
        },
        pipeline: {
          source: "approved course covers and published blog covers",
          delivery: [
            "source record stays linked to its content",
            ...CLOUDINARY_DELIVERY_STEPS.map((step) => `Cloudinary ${step}`),
          ],
        },
        query,
        type: requestedType,
      },
    });
  } catch (error) {
    console.error("media dashboard request failed", error);
    res.status(503).json({
      success: false,
      message: "The visual board is temporarily unavailable",
      code: "MEDIA_BOARD_UNAVAILABLE",
    });
  }
};
