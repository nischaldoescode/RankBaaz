/**
 * keeps the blog controller controller focused and readable.
 */
import crypto from "crypto";
import DOMPurify from "isomorphic-dompurify";
import { v2 as cloudinary } from "cloudinary";
import BlogAuthor from "../Models/BlogAuthor.js";
import BlogPost from "../Models/BlogPost.js";
import BlogComment from "../Models/BlogComment.js";
import BlogMedia from "../Models/BlogMedia.js";
import BlogIndexingSubmission from "../Models/BlogIndexingSubmission.js";
import ContactInfo from "../Models/ContactInfo.js";
import redisClient from "../Config/redis.js";
import {
  decryptBlogPayload,
  encryptBlogPayload,
  hashBlogPayload,
} from "../utils/blogCrypto.js";

const BLOG_CACHE_TTL = 300;
const BLOG_IMAGE_LIMIT = 5 * 1024 * 1024;
const BLOG_VIDEO_LIMIT = 10 * 1024 * 1024;
const BLOG_PENDING_MEDIA_TTL_MS = 12 * 60 * 60 * 1000;
const BLOG_BASE_URL =
  (process.env.BLOGS_SITE_URL || "https://blogs.vidhgrow.online").replace(/\/$/, "");
const BLOG_LIST_CACHE_TTL = 30;
const BLOG_INDEXNOW_KEY = String(
  process.env.BLOG_INDEXNOW_KEY || "e52015b801f54ed398dec9c093f1405b",
).trim();
const BLOG_INDEXNOW_ENDPOINT =
  process.env.BLOG_INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const BLOG_INDEXNOW_MIN_INTERVAL_SECONDS = Math.max(
  30,
  Number(process.env.BLOG_INDEXNOW_MIN_INTERVAL_SECONDS || 120),
);
const BLOG_INDEXNOW_MAX_URLS = Math.min(
  10000,
  Math.max(1, Number(process.env.BLOG_INDEXNOW_MAX_URLS || 10000)),
);

const BLOG_TOPIC_OPTIONS = [
  {
    slug: "product-updates",
    terms: ["product-updates", "product", "feature", "release", "platform"],
  },
  {
    slug: "teaching-workflows",
    terms: ["teaching-workflows", "teacher", "teaching", "workflow", "portal"],
  },
  {
    slug: "course-news",
    terms: ["course-news", "course", "builder", "lesson", "curriculum"],
  },
  {
    slug: "assessment-notes",
    terms: ["assessment-notes", "exam", "test", "assessment", "practice"],
  },
  {
    slug: "security-updates",
    terms: ["security-updates", "security", "verification", "privacy", "backend"],
  },
  {
    slug: "student-progress",
    terms: ["student-progress", "student", "progress", "practice", "completion"],
  },
  {
    slug: "admin-workflows",
    terms: ["admin-workflows", "admin", "approval", "workflow", "management"],
  },
  {
    slug: "feedback-notes",
    terms: ["feedback-notes", "feedback", "rating", "review", "comment"],
  },
];
const BLOG_TOPIC_SLUGS = new Set(BLOG_TOPIC_OPTIONS.map((topic) => topic.slug));

const allowedVideoHosts = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "www.dailymotion.com",
  "dailymotion.com",
];

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];

const toSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 160);

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (html = "") =>
  String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hashValue = (value = "") =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const isAllowedVideoUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      allowedVideoHosts.some((host) => parsed.hostname === host)
    );
  } catch {
    return false;
  }
};

const isAllowedUploadedVideoUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
};

const sanitizeBlogHtml = (html = "") => {
  const cleaned = DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe", "video", "source"],
    ADD_ATTR: [
      "target",
      "rel",
      "loading",
      "data-align",
      "data-width",
      "allow",
      "allowfullscreen",
      "frameborder",
      "controls",
      "controlslist",
      "disablepictureinpicture",
      "playsinline",
      "poster",
      "preload",
      "src",
      "type",
      "data-public-id",
      "data-resource-type",
      "style",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel):|\/(?!\/)|#|data:image\/(?:png|jpeg|webp|gif);base64,)/i,
  });

  return cleaned.replace(
    /<iframe\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/iframe>/gi,
    (match, before, src, after) => {
      if (!isAllowedVideoUrl(src)) return "";
      return `<iframe${before} src="${src}"${after} loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    },
  ).replace(
    /<video\b([^>]*)>([\s\S]*?)<\/video>/gi,
    (match, attrs, inner) => {
      const videoSrc = String(attrs).match(/\bsrc=["']([^"']+)["']/i)?.[1];
      const sourceSrc = String(inner).match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
      const src = videoSrc || sourceSrc;

      if (!src || !isAllowedUploadedVideoUrl(src)) return "";

      return `<video${attrs} controls controlslist="nodownload noremoteplayback" disablepictureinpicture playsinline preload="metadata">${inner}</video>`;
    },
  );
};

const normaliseTags = (tags = []) =>
  [...new Set((Array.isArray(tags) ? tags : String(tags).split(","))
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12))]
    .map((tag) => tag.slice(0, 40));

const normaliseTopics = (topics = []) =>
  [...new Set((Array.isArray(topics) ? topics : String(topics).split(","))
    .map(toSlug)
    .filter((topic) => BLOG_TOPIC_SLUGS.has(topic))
    .slice(0, 6))];

const getBlogTopic = (topic = "") =>
  BLOG_TOPIC_OPTIONS.find((item) => item.slug === toSlug(topic));

const applyTopicQuery = (query, topicSlug = "") => {
  const topic = getBlogTopic(topicSlug);
  if (!topic) return false;
  query.$or = [
    { topics: topic.slug },
    { tags: { $in: topic.terms } },
    { category: { $in: topic.terms } },
  ];
  return true;
};

const calculateStats = (contentHtml = "") => {
  const plainText = stripHtml(contentHtml);
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const h1Match = String(contentHtml).match(/<h1[^>]*>(.*?)<\/h1>/i);
  return {
    plainText,
    wordCount: words,
    readingTimeMinutes: Math.max(1, Math.ceil(words / 220)),
    h1: h1Match ? stripHtml(h1Match[1]).slice(0, 140) : "",
  };
};

const invalidateBlogCaches = async () => {
  try {
    const keys = await redisClient.keys("blogs:*");
    if (keys.length) await redisClient.del(...keys);
  } catch {}
};

const decryptPostContent = (post) => {
  const payload = decryptBlogPayload(post.contentEncrypted);
  return sanitizeBlogHtml(payload.contentHtml || "");
};

const serializeAuthor = (author) => {
  if (!author) return null;
  return {
    _id: author._id,
    name: author.name,
    slug: author.slug,
    title: author.title || "",
    bio: author.bio || "",
    avatar: author.avatar || {},
    avatarFallback: buildAuthorAvatarFallback(author.name),
    socialLinks: author.socialLinks || {},
  };
};

const serializePost = (post, { includeContent = false } = {}) => {
  const doc = post.toObject ? post.toObject() : post;
  const url = `${BLOG_BASE_URL}/${doc.slug}`;
  const base = {
    _id: doc._id,
    title: doc.title,
    slug: doc.slug,
    url,
    excerpt: doc.excerpt,
    status: doc.status,
    author: serializeAuthor(doc.author),
    coverImage: doc.coverImage,
    topics: doc.topics || [],
    tags: doc.tags || [],
    category: doc.category || "learning",
    h1: doc.h1 || doc.title,
    wordCount: doc.wordCount || 0,
    readingTimeMinutes: doc.readingTimeMinutes || 1,
    seo: {
      metaTitle: doc.seo?.metaTitle || doc.title,
      metaDescription: doc.seo?.metaDescription || doc.excerpt,
      keywords: doc.seo?.keywords || doc.tags || [],
      canonicalUrl: doc.seo?.canonicalUrl || url,
      robots: doc.seo?.robots || {
        index: true,
        follow: true,
        maxSnippet: -1,
        maxImagePreview: "large",
      },
    },
    social: {
      shareTitle: doc.social?.shareTitle || doc.title,
      shareDescription: doc.social?.shareDescription || doc.excerpt,
    },
    publishedAt: doc.publishedAt,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };

  if (includeContent) {
    base.contentHtml = decryptPostContent(doc);
  }

  return base;
};

const getPublishedQuery = () => ({
  status: "published",
  publishedAt: { $lte: new Date() },
});

const getBlogHost = () => new URL(BLOG_BASE_URL).host;

const getIndexNowKeyLocation = () =>
  BLOG_INDEXNOW_KEY ? `${BLOG_BASE_URL}/${BLOG_INDEXNOW_KEY}.txt` : "";

const truncateLog = (value = "", limit = 1000) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

const getBlogSitemapEntries = async () => {
  const [posts, authors] = await Promise.all([
    BlogPost.find(getPublishedQuery()).select("slug updatedAt publishedAt").lean(),
    BlogAuthor.find({ isActive: true }).select("slug updatedAt").lean(),
  ]);

  return [
    {
      type: "home",
      loc: BLOG_BASE_URL,
      lastmod: new Date().toISOString(),
    },
    ...BLOG_TOPIC_OPTIONS.map((topic) => ({
      type: "topic",
      loc: `${BLOG_BASE_URL}/topic/${topic.slug}`,
      lastmod: new Date().toISOString(),
    })),
    ...posts.map((post) => ({
      type: "post",
      loc: `${BLOG_BASE_URL}/${post.slug}`,
      lastmod: new Date(post.updatedAt || post.publishedAt).toISOString(),
    })),
    ...authors.map((author) => ({
      type: "author",
      loc: `${BLOG_BASE_URL}/author/${author.slug}`,
      lastmod: new Date(author.updatedAt).toISOString(),
    })),
  ];
};

const isBlogOwnedUrl = (url = "") => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.host === getBlogHost();
  } catch {
    return false;
  }
};

const getLatestSubmissionLogs = async () => {
  const rows = await BlogIndexingSubmission.find({})
    .sort({ submittedAt: -1 })
    .limit(200)
    .lean();

  const grouped = new Map();
  rows.forEach((row) => {
    const key = row.batchId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        batchId: key,
        provider: row.provider,
        kind: row.kind,
        status: row.status,
        responseStatus: row.responseStatus,
        responseBody: row.responseBody || "",
        errorMessage: row.errorMessage || "",
        submittedAt: row.submittedAt,
        urlCount: 0,
        sampleUrls: [],
      });
    }
    const item = grouped.get(key);
    item.urlCount += 1;
    if (row.status === "failed") item.status = "failed";
    if (item.sampleUrls.length < 4) item.sampleUrls.push(row.url);
  });

  return [...grouped.values()].slice(0, 12);
};

const getIndexNowUrlStates = async (entries) => {
  const hashes = entries.map((entry) => hashValue(entry.loc));
  const rows = await BlogIndexingSubmission.find({
    provider: "indexnow",
    urlHash: { $in: hashes },
  })
    .sort({ submittedAt: -1 })
    .lean();

  const latestByHash = new Map();
  const successByHash = new Map();
  rows.forEach((row) => {
    if (!latestByHash.has(row.urlHash)) latestByHash.set(row.urlHash, row);
    if (row.status === "success" && !successByHash.has(row.urlHash)) {
      successByHash.set(row.urlHash, row);
    }
  });

  return entries.map((entry) => {
    const urlHash = hashValue(entry.loc);
    const latest = latestByHash.get(urlHash);
    const success = successByHash.get(urlHash);
    return {
      ...entry,
      alreadySubmitted: !!success,
      lastSubmittedAt: success?.submittedAt || latest?.submittedAt || null,
      lastStatus: latest?.status || "new",
      lastResponseStatus: latest?.responseStatus || null,
    };
  });
};

const createIndexingRecords = async ({
  provider,
  kind,
  urls,
  batchId,
  status,
  responseStatus,
  responseBody,
  errorMessage,
  submittedBy,
  sitemapUrl = "",
}) => {
  if (!urls.length) return;
  await BlogIndexingSubmission.insertMany(
    urls.map((url) => ({
      provider,
      kind,
      url,
      urlHash: hashValue(url),
      batchId,
      host: getBlogHost(),
      sitemapUrl,
      status,
      responseStatus,
      responseBody: truncateLog(responseBody, 4000),
      errorMessage: truncateLog(errorMessage, 1000),
      submittedBy,
      submittedAt: new Date(),
    })),
  );
};

const cleanComment = (value = "") =>
  stripHtml(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

const getUploadedFile = (req) => {
  const uploaded = req.files?.file || req.files?.media || req.files?.image || null;
  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
};

const cleanMediaSessionId = (value = "") =>
  String(value || "")
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 120);

const normalisePublicId = (value = "") =>
  String(value || "")
    .trim()
    .replace(/[^\w./:-]/g, "")
    .slice(0, 260);

const isBlogManagedPublicId = (publicId = "") =>
  String(publicId).startsWith("vidhgrow/blogs/");

const collectPublicIdsFromHtml = (html = "") => {
  const ids = new Set();
  String(html).replace(/\bdata-public-id=["']([^"']+)["']/gi, (match, publicId) => {
    const clean = normalisePublicId(publicId);
    if (clean) ids.add(clean);
    return match;
  });
  return ids;
};

const collectPostMediaPublicIds = (post = {}, contentHtml = "") => {
  const ids = collectPublicIdsFromHtml(contentHtml);
  const coverId = normalisePublicId(post.coverImage?.public_id);
  if (coverId) ids.add(coverId);
  return ids;
};

const destroyCloudinaryMedia = async (media) => {
  const publicId = normalisePublicId(media?.public_id || media?.publicId || media);
  if (!publicId) return;

  await cloudinary.uploader
    .destroy(publicId, {
      resource_type: media?.resource_type || media?.resourceType || "image",
      type: media?.type || "upload",
      invalidate: true,
    })
    .catch((error) => {
      console.warn("Failed to delete blog media:", publicId, error.message);
    });
};

const cleanupStalePendingBlogMedia = async () => {
  const cutoff = new Date(Date.now() - BLOG_PENDING_MEDIA_TTL_MS);
  const stale = await BlogMedia.find({
    status: "pending",
    createdAt: { $lt: cutoff },
  })
    .limit(30)
    .lean()
    .catch(() => []);

  if (!stale.length) return;

  await Promise.all(stale.map(destroyCloudinaryMedia));
  await BlogMedia.updateMany(
    { _id: { $in: stale.map((item) => item._id) } },
    { status: "deleted", deletedAt: new Date() },
  ).catch(() => {});
};

const discardPendingBlogMedia = async ({ adminId, sessionId, publicIds = [] }) => {
  const query = {
    createdBy: adminId,
    status: "pending",
  };
  const cleanSessionId = cleanMediaSessionId(sessionId);
  const cleanIds = [...new Set(publicIds.map(normalisePublicId).filter(Boolean))];

  if (cleanSessionId) query.sessionId = cleanSessionId;
  if (cleanIds.length) query.public_id = { $in: cleanIds };
  if (!cleanSessionId && !cleanIds.length) return { deleted: 0 };

  const pendingMedia = await BlogMedia.find(query).lean();
  await Promise.all(pendingMedia.map(destroyCloudinaryMedia));
  if (pendingMedia.length) {
    await BlogMedia.updateMany(
      { _id: { $in: pendingMedia.map((media) => media._id) } },
      { status: "deleted", deletedAt: new Date() },
    );
  }

  return { deleted: pendingMedia.length };
};

const attachBlogMedia = async ({ adminId, sessionId, publicIds, kind, attachedId }) => {
  const ids = [...new Set([...publicIds].map(normalisePublicId).filter(Boolean))];
  const cleanSessionId = cleanMediaSessionId(sessionId);
  if (!ids.length) {
    if (cleanSessionId) await discardPendingBlogMedia({ adminId, sessionId: cleanSessionId });
    return;
  }

  await BlogMedia.updateMany(
    {
      createdBy: adminId,
      public_id: { $in: ids },
      status: { $ne: "deleted" },
    },
    {
      status: "attached",
      attachedTo: { kind, id: attachedId },
      attachedAt: new Date(),
    },
  );

  if (cleanSessionId) {
    const unusedPending = await BlogMedia.find({
      createdBy: adminId,
      sessionId: cleanSessionId,
      status: "pending",
      public_id: { $nin: ids },
    }).lean();

    await Promise.all(unusedPending.map(destroyCloudinaryMedia));
    if (unusedPending.length) {
      await BlogMedia.updateMany(
        { _id: { $in: unusedPending.map((media) => media._id) } },
        { status: "deleted", deletedAt: new Date() },
      );
    }
  }
};

const deleteRemovedAttachedMedia = async ({ ownerKind, ownerId, keepPublicIds }) => {
  const keep = [...keepPublicIds].map(normalisePublicId).filter(Boolean);
  const removed = await BlogMedia.find({
    status: "attached",
    "attachedTo.kind": ownerKind,
    "attachedTo.id": ownerId,
    ...(keep.length ? { public_id: { $nin: keep } } : {}),
  }).lean();

  await Promise.all(removed.map(destroyCloudinaryMedia));
  if (removed.length) {
    await BlogMedia.updateMany(
      { _id: { $in: removed.map((media) => media._id) } },
      { status: "deleted", deletedAt: new Date() },
    );
  }
};

const normaliseOptionalUrl = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const buildAuthorAvatarFallback = (name = "") => {
  const letter = String(name || "V").trim().charAt(0).toUpperCase() || "V";
  const palette = [
    { background: "#dbeafe", color: "#1d4ed8" },
    { background: "#dcfce7", color: "#15803d" },
    { background: "#fef3c7", color: "#b45309" },
    { background: "#fae8ff", color: "#a21caf" },
    { background: "#fee2e2", color: "#b91c1c" },
    { background: "#e0f2fe", color: "#0369a1" },
  ];
  const code = letter.charCodeAt(0) || 0;
  const colors = palette[code % palette.length];

  return { letter, ...colors };
};

export const listPublishedBlogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(24, Math.max(1, Number(req.query.limit || 10)));
    const tag = req.query.tag ? String(req.query.tag).toLowerCase() : null;
    const topic = req.query.topic ? toSlug(req.query.topic) : null;
    const fresh = req.query.fresh === "1" || req.query.fresh === "true";
    const cacheKey = `blogs:v2:list:${page}:${limit}:${tag || "all"}:${topic || "all"}`;

    const cached = fresh ? null : await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const query = getPublishedQuery();
    if (tag) query.tags = tag;
    if (topic && !applyTopicQuery(query, topic)) {
      return res.status(200).json({
        success: true,
        data: {
          posts: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        },
      });
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .populate("author", "name slug title bio avatar socialLinks")
        .select("-contentEncrypted -contentHash")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    const response = {
      success: true,
      data: {
        posts: posts.map((post) => serializePost(post)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    await redisClient.setex(cacheKey, BLOG_LIST_CACHE_TTL, JSON.stringify(response)).catch(() => {});
    return res.status(200).json(response);
  } catch (error) {
    console.error("List published blogs error:", error);
    return res.status(500).json({ success: false, message: "Failed to load blogs" });
  }
};

export const getPublishedBlogBySlug = async (req, res) => {
  try {
    const slug = toSlug(req.params.slug);
    const cacheKey = `blogs:post:${slug}`;
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const post = await BlogPost.findOne({ slug, ...getPublishedQuery() })
      .populate("author", "name slug title bio avatar socialLinks")
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const comments = await BlogComment.find({
      post: post._id,
      status: "visible",
    })
      .populate("user", "name username")
      .sort({ createdAt: 1 })
      .lean();

    const topLevel = comments.filter((comment) => !comment.parentComment);
    const replies = comments.filter((comment) => comment.parentComment);
    const commentTree = topLevel.map((comment) => ({
      _id: comment._id,
      content: comment.content,
      user: comment.user,
      createdAt: comment.createdAt,
      replies: replies
        .filter(
          (reply) =>
            reply.parentComment?.toString() === comment._id.toString(),
        )
        .map((reply) => ({
          _id: reply._id,
          content: reply.content,
          user: reply.user,
          createdAt: reply.createdAt,
        })),
    }));

    const relatedQuery = {
      ...getPublishedQuery(),
      _id: { $ne: post._id },
      $or: [
        ...(post.topics?.length ? [{ topics: { $in: post.topics } }] : []),
        ...(post.tags?.length ? [{ tags: { $in: post.tags } }] : []),
        ...(post.category ? [{ category: post.category }] : []),
        ...(post.author?._id ? [{ author: post.author._id }] : []),
      ],
    };

    const relatedPosts = await BlogPost.find(
      relatedQuery.$or.length
        ? relatedQuery
        : { ...getPublishedQuery(), _id: { $ne: post._id } },
    )
      .populate("author", "name slug avatar title")
      .select("-contentEncrypted -contentHash")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(3)
      .lean();

    const response = {
      success: true,
      data: {
        post: serializePost(post, { includeContent: true }),
        comments: commentTree,
        relatedPosts: relatedPosts.map((item) => serializePost(item)),
      },
    };

    await redisClient.setex(cacheKey, BLOG_CACHE_TTL, JSON.stringify(response)).catch(() => {});
    return res.status(200).json(response);
  } catch (error) {
    console.error("Get blog error:", error);
    return res.status(500).json({ success: false, message: "Failed to load blog" });
  }
};

export const getPublishedAuthor = async (req, res) => {
  try {
    const author = await BlogAuthor.findOne({
      slug: toSlug(req.params.slug),
      isActive: true,
    }).lean();

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    const posts = await BlogPost.find({
      ...getPublishedQuery(),
      author: author._id,
    })
      .select("-contentEncrypted -contentHash")
      .sort({ publishedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        author: serializeAuthor(author),
        posts: posts.map((post) => serializePost({ ...post, author })),
      },
    });
  } catch (error) {
    console.error("Get blog author error:", error);
    return res.status(500).json({ success: false, message: "Failed to load author" });
  }
};

export const getBlogShareSettings = async (req, res) => {
  try {
    const contact = await ContactInfo.getContactInfo();
    return res.status(200).json({
      success: true,
      data: {
        socialMedia: contact.socialMedia || {},
        copyrightText: contact.copyrightText || "Vidhgrow",
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load settings" });
  }
};

export const createBlogComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user?.userId;
    const content = cleanComment(req.body?.content);
    const parentCommentId = req.body?.parentComment || null;
    const rateKey = `blogs:comment-rate:${userId}:${postId}`;
    const commentAttempts = await redisClient.incr(rateKey).catch(() => 1);

    if (commentAttempts === 1) {
      await redisClient.expire(rateKey, 10 * 60).catch(() => {});
    }

    if (commentAttempts > 5) {
      return res.status(429).json({
        success: false,
        message: "Too many comment attempts. Please try again later.",
      });
    }

    if (!content) {
      return res.status(400).json({ success: false, message: "Comment is required" });
    }

    if (content.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Comments are limited to 100 characters",
      });
    }

    const post = await BlogPost.findOne({ _id: postId, ...getPublishedQuery() })
      .select("_id slug")
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await BlogComment.findOne({
        _id: parentCommentId,
        post: postId,
        user: userId,
        parentComment: null,
        status: "visible",
      }).lean();

      if (!parentComment) {
        return res.status(403).json({
          success: false,
          message: "You can only reply inside your own top-level comment",
        });
      }
    } else {
      const existingTopLevel = await BlogComment.exists({
        post: postId,
        user: userId,
        parentComment: null,
        status: { $ne: "removed" },
      });

      if (existingTopLevel) {
        return res.status(409).json({
          success: false,
          message: "You already commented on this blog",
        });
      }
    }

    const comment = await BlogComment.create({
      post: postId,
      user: userId,
      parentComment: parentComment?._id || null,
      content,
      ipHash: hashValue(req.ip || req.connection.remoteAddress || ""),
      userAgentHash: hashValue(req.get("User-Agent") || ""),
    });

    await redisClient.del(`blogs:post:${post.slug}`).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Comment posted",
      data: { comment },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already commented on this blog",
      });
    }
    console.error("Create blog comment error:", error);
    return res.status(500).json({ success: false, message: "Failed to post comment" });
  }
};

export const generateBlogSitemap = async (req, res) => {
  try {
    const cacheKey = "blogs:sitemap";
    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      res.header("Content-Type", "application/xml");
      return res.send(cached);
    }

    const urls = await getBlogSitemapEntries();
    const sitemapMeta = {
      home: { changefreq: "daily", priority: "1.0" },
      topic: { changefreq: "weekly", priority: "0.6" },
      post: { changefreq: "weekly", priority: "0.8" },
      author: { changefreq: "monthly", priority: "0.5" },
    };

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => {
    const meta = sitemapMeta[url.type] || sitemapMeta.post;
    return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

    await redisClient.setex(cacheKey, 3600, sitemap).catch(() => {});
    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    return res.send(sitemap);
  } catch (error) {
    console.error("Blog sitemap error:", error);
    return res.status(500).send("Failed to generate sitemap");
  }
};

export const adminGetBlogIndexingStatus = async (req, res) => {
  try {
    const entries = await getBlogSitemapEntries();
    const urlStates = await getIndexNowUrlStates(entries);
    const newUrls = urlStates.filter((item) => !item.alreadySubmitted);
    const recentLogs = await getLatestSubmissionLogs();

    return res.status(200).json({
      success: true,
      data: {
        sitemap: {
          url: `${BLOG_BASE_URL}/sitemap.xml`,
          count: entries.length,
          urls: urlStates,
        },
        indexNow: {
          configured: !!BLOG_INDEXNOW_KEY,
          endpoint: BLOG_INDEXNOW_ENDPOINT,
          host: getBlogHost(),
          keyLocation: getIndexNowKeyLocation(),
          cooldownSeconds: BLOG_INDEXNOW_MIN_INTERVAL_SECONDS,
          maxUrlsPerSubmission: BLOG_INDEXNOW_MAX_URLS,
          submittedCount: urlStates.length - newUrls.length,
          newCount: newUrls.length,
          newUrls: newUrls.map((item) => item.loc),
        },
        logs: recentLogs,
      },
    });
  } catch (error) {
    console.error("Blog indexing status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load blog indexing status",
    });
  }
};

export const adminSubmitBlogIndexNow = async (req, res) => {
  const batchId = crypto.randomUUID();
  const submittedBy = req.admin?.userId || req.admin?.adminId || null;
  let attemptedUrls = [];

  try {
    if (!BLOG_INDEXNOW_KEY) {
      return res.status(400).json({
        success: false,
        message: "IndexNow key is not configured",
      });
    }

    const recentCutoff = new Date(Date.now() - BLOG_INDEXNOW_MIN_INTERVAL_SECONDS * 1000);
    const recentSubmission = await BlogIndexingSubmission.findOne({
      provider: "indexnow",
      submittedAt: { $gte: recentCutoff },
    })
      .sort({ submittedAt: -1 })
      .lean();

    if (recentSubmission) {
      return res.status(429).json({
        success: false,
        message: `IndexNow was submitted recently. Wait ${BLOG_INDEXNOW_MIN_INTERVAL_SECONDS} seconds between submissions.`,
        data: { lastSubmittedAt: recentSubmission.submittedAt },
      });
    }

    const entries = await getBlogSitemapEntries();
    const urlStates = await getIndexNowUrlStates(entries);
    const newUrls = urlStates
      .filter((item) => !item.alreadySubmitted)
      .map((item) => item.loc)
      .filter(isBlogOwnedUrl)
      .slice(0, BLOG_INDEXNOW_MAX_URLS);
    attemptedUrls = newUrls;

    if (!newUrls.length) {
      return res.status(409).json({
        success: false,
        message: "No new blog URLs are waiting for IndexNow submission",
        data: { newCount: 0 },
      });
    }

    const payload = {
      host: getBlogHost(),
      key: BLOG_INDEXNOW_KEY,
      keyLocation: getIndexNowKeyLocation(),
      urlList: newUrls,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let response;
    let responseText = "";
    try {
      response = await fetch(BLOG_INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      responseText = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    const succeeded = response.status >= 200 && response.status < 300;
    await createIndexingRecords({
      provider: "indexnow",
      kind: "url",
      urls: newUrls,
      batchId,
      status: succeeded ? "success" : "failed",
      responseStatus: response.status,
      responseBody: responseText || (succeeded ? "IndexNow accepted the URL batch" : ""),
      errorMessage: succeeded ? "" : `IndexNow returned HTTP ${response.status}`,
      submittedBy,
      sitemapUrl: `${BLOG_BASE_URL}/sitemap.xml`,
    });

    return res.status(succeeded ? 200 : 502).json({
      success: succeeded,
      message: succeeded
        ? `Submitted ${newUrls.length} blog URLs to IndexNow`
        : "IndexNow did not accept the submission",
      data: {
        batchId,
        submittedCount: newUrls.length,
        responseStatus: response.status,
        responseBody: truncateLog(responseText, 1000),
      },
    });
  } catch (error) {
    const isAbort = error.name === "AbortError";
    await createIndexingRecords({
      provider: "indexnow",
      kind: "url",
      urls: attemptedUrls,
      batchId,
      status: "failed",
      responseStatus: null,
      responseBody: "",
      errorMessage: isAbort ? "IndexNow request timed out" : error.message,
      submittedBy,
      sitemapUrl: `${BLOG_BASE_URL}/sitemap.xml`,
    }).catch(() => {});

    console.error("Blog IndexNow submit error:", error);
    return res.status(isAbort ? 504 : 500).json({
      success: false,
      message: isAbort ? "IndexNow request timed out" : "Failed to submit URLs to IndexNow",
    });
  }
};

export const adminCheckBlogSlug = async (req, res) => {
  try {
    const type = req.query.type === "author" ? "author" : "post";
    const slug = toSlug(req.query.slug || "");
    const excludeId = req.query.excludeId ? String(req.query.excludeId) : null;

    if (!slug || slug.length < (type === "author" ? 2 : 5)) {
      return res.status(200).json({
        success: true,
        data: {
          slug,
          available: false,
          reason:
            type === "author"
              ? "Author slug must be at least 2 characters"
              : "Blog slug must be at least 5 characters",
        },
      });
    }

    const Model = type === "author" ? BlogAuthor : BlogPost;
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };

    const existing = await Model.exists(query);

    return res.status(200).json({
      success: true,
      data: {
        slug,
        available: !existing,
        reason: existing ? "This slug is already in use" : "",
      },
    });
  } catch (error) {
    console.error("Check blog slug error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check slug",
    });
  }
};

export const adminUploadBlogMedia = async (req, res) => {
  try {
    await cleanupStalePendingBlogMedia();

    const kind = req.query.kind === "video" ? "video" : "image";
    const file = getUploadedFile(req);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Upload a file before continuing",
      });
    }

    const isVideo = kind === "video";
    const allowedTypes = isVideo ? allowedVideoTypes : allowedImageTypes;
    const limit = isVideo ? BLOG_VIDEO_LIMIT : BLOG_IMAGE_LIMIT;

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: isVideo
          ? "Only MP4, WebM, and MOV videos are allowed"
          : "Only JPEG, PNG, WebP, and GIF images are allowed",
      });
    }

    if (file.size > limit) {
      return res.status(400).json({
        success: false,
        message: isVideo
          ? "Video is too large. Maximum size is 10MB"
          : "Image is too large. Maximum size is 5MB",
      });
    }

    const deliveryType =
      isVideo && process.env.BLOG_VIDEO_DELIVERY_TYPE === "authenticated"
        ? "authenticated"
        : "upload";
    const sessionId = cleanMediaSessionId(req.body?.sessionId || req.query.sessionId);
    const purpose = String(req.query.purpose || "blog-media").slice(0, 60);

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: isVideo ? "video" : "image",
      folder: isVideo ? "vidhgrow/blogs/videos" : "vidhgrow/blogs/images",
      type: deliveryType,
      allowed_formats: isVideo
        ? ["mp4", "webm", "mov"]
        : ["jpg", "jpeg", "png", "webp", "gif"],
      transformation: isVideo
        ? [{ quality: "auto" }]
        : [{ quality: "auto", fetch_format: "auto" }],
      context: {
        uploaded_by: String(req.admin?.userId || ""),
        purpose,
        session_id: sessionId,
        lifecycle: "pending",
      },
    });

    const signedVideoUrl =
      isVideo && deliveryType === "authenticated"
        ? cloudinary.url(result.public_id, {
            resource_type: "video",
            type: "authenticated",
            secure: true,
            sign_url: true,
          })
        : "";
    const media = await BlogMedia.create({
      public_id: result.public_id,
      url: signedVideoUrl || result.secure_url,
      resource_type: result.resource_type,
      type: result.type || deliveryType,
      purpose,
      sessionId,
      originalFilename: result.original_filename || file.name,
      bytes: result.bytes || file.size || 0,
      status: "pending",
      createdBy: req.admin.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Media uploaded as pending. It will be kept only after the blog or author is saved.",
      data: {
        media: {
          _id: media._id,
          url: signedVideoUrl || result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          type: result.type,
          format: result.format,
          bytes: result.bytes,
          width: result.width || null,
          height: result.height || null,
          duration: result.duration || null,
          originalFilename: result.original_filename || file.name,
          status: "pending",
        },
      },
    });
  } catch (error) {
    console.error("Admin upload blog media error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload media",
    });
  }
};

export const adminDiscardBlogMedia = async (req, res) => {
  try {
    const publicIds = Array.isArray(req.body?.publicIds) ? req.body.publicIds : [];
    const sessionId = req.body?.sessionId || req.query.sessionId || "";
    const result = await discardPendingBlogMedia({
      adminId: req.admin.userId,
      sessionId,
      publicIds,
    });

    return res.status(200).json({
      success: true,
      message: "Pending media discarded",
      data: result,
    });
  } catch (error) {
    console.error("Discard blog media error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to discard pending media",
    });
  }
};

export const adminListBlogPosts = async (req, res) => {
  try {
    await cleanupStalePendingBlogMedia();

    const posts = await BlogPost.find({})
      .populate("author", "name slug avatar title")
      .select("-contentEncrypted")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { posts },
    });
  } catch (error) {
    console.error("Admin list blog posts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load posts" });
  }
};

export const adminGetBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.postId)
      .populate("author", "name slug avatar title bio socialLinks")
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        post: serializePost(post, { includeContent: true }),
      },
    });
  } catch (error) {
    console.error("Admin get blog post error:", error);
    return res.status(500).json({ success: false, message: "Failed to load post" });
  }
};

const buildPostPayload = async (body, adminId, existingPost = null) => {
  const status = body.publish === true || body.status === "published" ? "published" : "draft";
  const submittedTitle = String(body.title || "").trim();
  const title =
    submittedTitle || existingPost?.title || `Untitled draft ${new Date().toISOString().slice(0, 10)}`;
  const slug = toSlug(body.slug || (submittedTitle ? title : existingPost?.slug) || `draft-${Date.now()}`);
  const excerpt = String(body.excerpt || "").trim();
  const contentHtml = sanitizeBlogHtml(body.contentHtml || "<p></p>");
  const stats = calculateStats(contentHtml);
  const isPublishing = status === "published";

  if (isPublishing) {
    if (submittedTitle.length < 5) throw new Error("Title must be at least 5 characters");
    if (slug.length < 5) throw new Error("Slug must be at least 5 characters");
    if (excerpt.length < 40) throw new Error("Excerpt must be at least 40 characters");
    if (!stripHtml(contentHtml)) throw new Error("Blog content is required");
    if (!body.author) throw new Error("Author is required");
    if (!body.coverImage?.url || !body.coverImage?.alt) {
      throw new Error("Cover image URL and alt text are required");
    }
    if (!normaliseOptionalUrl(body.coverImage.url)) {
      throw new Error("Cover image must be a valid HTTPS URL");
    }
  }

  const author = body.author
    ? await BlogAuthor.findOne({ _id: body.author, isActive: true })
    : null;
  if (body.author && !author) throw new Error("Selected author was not found");

  const seo = body.seo || {};
  const robots = seo.robots || {};
  const scheduledFor = null;
  const publishedAt =
    status === "published"
      ? existingPost?.publishedAt || new Date()
      : null;
  const coverUrl = normaliseOptionalUrl(body.coverImage?.url);
  const mediaPublicIds = collectPostMediaPublicIds(
    { coverImage: body.coverImage || {} },
    contentHtml,
  );

  return {
    mediaPublicIds,
    mediaSessionId: cleanMediaSessionId(body.mediaSessionId),
    title,
    slug,
    excerpt,
    status,
    author: author?._id || undefined,
    coverImage: {
      url: coverUrl,
      public_id: String(body.coverImage?.public_id || "").trim(),
      resource_type: String(body.coverImage?.resource_type || "image").trim(),
      alt: String(body.coverImage?.alt || "").trim(),
      placement: ["hero", "inline", "wide"].includes(body.coverImage?.placement)
        ? body.coverImage.placement
        : "hero",
    },
    contentEncrypted: encryptBlogPayload({ contentHtml }),
    contentHash: hashBlogPayload({ contentHtml }),
    plainTextPreview: stats.plainText.slice(0, 500),
    h1: stats.h1 || title,
    wordCount: stats.wordCount,
    readingTimeMinutes: stats.readingTimeMinutes,
    topics: normaliseTopics(body.topics),
    tags: normaliseTags(body.tags),
    category: String(body.category || "learning").trim().slice(0, 60),
    seo: {
      metaTitle: String(seo.metaTitle || title).trim().slice(0, 70),
      metaDescription: String(seo.metaDescription || excerpt).trim().slice(0, 170),
      keywords: normaliseTags(seo.keywords || body.tags),
      canonicalUrl: String(seo.canonicalUrl || `${BLOG_BASE_URL}/${slug}`).trim(),
      robots: {
        index: robots.index !== false,
        follow: robots.follow !== false,
        maxSnippet: Number.isFinite(Number(robots.maxSnippet))
          ? Number(robots.maxSnippet)
          : -1,
        maxImagePreview: ["none", "standard", "large"].includes(
          robots.maxImagePreview,
        )
          ? robots.maxImagePreview
          : "large",
      },
    },
    social: {
      shareTitle: String(body.social?.shareTitle || title).trim().slice(0, 90),
      shareDescription: String(body.social?.shareDescription || excerpt)
        .trim()
        .slice(0, 220),
    },
    scheduledFor,
    publishedAt,
    lastEditedBy: adminId,
  };
};

export const adminCreateBlogPost = async (req, res) => {
  try {
    const { mediaPublicIds, mediaSessionId, ...payload } = await buildPostPayload(
      req.body,
      req.admin.userId,
    );
    const post = await BlogPost.create({
      ...payload,
      createdBy: req.admin.userId,
    });
    await attachBlogMedia({
      adminId: req.admin.userId,
      sessionId: mediaSessionId,
      publicIds: mediaPublicIds,
      kind: "post",
      attachedId: post._id,
    });

    await invalidateBlogCaches();
    return res.status(201).json({
      success: true,
      message: "Blog post saved",
      data: { post },
    });
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 11000 ? "Slug is already in use" : error.message,
    });
  }
};

export const adminUpdateBlogPost = async (req, res) => {
  try {
    const existingPost = await BlogPost.findById(req.params.postId);
    if (!existingPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const previousPublicIds = collectPostMediaPublicIds(
      existingPost,
      decryptPostContent(existingPost),
    );
    const { mediaPublicIds, mediaSessionId, ...payload } = await buildPostPayload(
      req.body,
      req.admin.userId,
      existingPost,
    );
    const post = await BlogPost.findByIdAndUpdate(req.params.postId, payload, {
      new: true,
      runValidators: true,
    });
    await attachBlogMedia({
      adminId: req.admin.userId,
      sessionId: mediaSessionId,
      publicIds: mediaPublicIds,
      kind: "post",
      attachedId: post._id,
    });
    await deleteRemovedAttachedMedia({
      ownerKind: "post",
      ownerId: post._id,
      keepPublicIds: mediaPublicIds,
    });
    const removedLegacyIds = [...previousPublicIds].filter(
      (publicId) => !mediaPublicIds.has(publicId) && isBlogManagedPublicId(publicId),
    );
    const removedLegacyMedia = await BlogMedia.find({
      public_id: { $in: removedLegacyIds },
      status: { $ne: "deleted" },
    }).lean();
    const trackedLegacyIds = new Set(removedLegacyMedia.map((media) => media.public_id));
    for (const publicId of removedLegacyIds) {
      if (!trackedLegacyIds.has(publicId)) {
        await destroyCloudinaryMedia({ public_id: publicId, resource_type: "image" });
      }
    }

    await invalidateBlogCaches();
    return res.status(200).json({
      success: true,
      message: "Blog post updated",
      data: { post },
    });
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 11000 ? "Slug is already in use" : error.message,
    });
  }
};

export const adminDeleteBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.postId).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const contentHtml = decryptPostContent(post);
    const publicIds = collectPostMediaPublicIds(post, contentHtml);
    const trackedMedia = await BlogMedia.find({
      $or: [
        { "attachedTo.kind": "post", "attachedTo.id": post._id },
        { public_id: { $in: [...publicIds] } },
      ],
      status: { $ne: "deleted" },
    }).lean();
    const trackedIds = new Set(trackedMedia.map((media) => media.public_id));
    await Promise.all(trackedMedia.map(destroyCloudinaryMedia));

    for (const publicId of publicIds) {
      if (!trackedIds.has(publicId)) {
        await destroyCloudinaryMedia({
          public_id: publicId,
          resource_type: publicId === post.coverImage?.public_id ? post.coverImage.resource_type : "image",
        });
      }
    }

    if (trackedMedia.length) {
      await BlogMedia.updateMany(
        { _id: { $in: trackedMedia.map((media) => media._id) } },
        { status: "deleted", deletedAt: new Date() },
      );
    }

    await BlogComment.deleteMany({ post: post._id });
    await invalidateBlogCaches();
    return res.status(200).json({ success: true, message: "Blog post deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete post" });
  }
};

export const adminListAuthors = async (req, res) => {
  try {
    const authors = await BlogAuthor.find({}).sort({ name: 1 }).lean();
    return res.status(200).json({ success: true, data: { authors } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load authors" });
  }
};

export const adminCreateAuthor = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const slug = toSlug(req.body.slug || name);
    const avatarPublicId = normalisePublicId(req.body.avatar?.public_id);
    const mediaSessionId = cleanMediaSessionId(req.body.mediaSessionId);
    if (name.length < 2) throw new Error("Author name is required");
    if (slug.length < 2) throw new Error("Author slug is required");

    const author = await BlogAuthor.create({
      name,
      slug,
      title: String(req.body.title || "").trim(),
      bio: String(req.body.bio || "").trim(),
      avatar: {
        url: normaliseOptionalUrl(req.body.avatar?.url),
        public_id: avatarPublicId,
        alt: String(req.body.avatar?.alt || name).trim().slice(0, 140),
      },
      socialLinks: req.body.socialLinks || {},
      isActive: req.body.isActive !== false,
      createdBy: req.admin.userId,
    });
    await attachBlogMedia({
      adminId: req.admin.userId,
      sessionId: mediaSessionId,
      publicIds: avatarPublicId ? new Set([avatarPublicId]) : new Set(),
      kind: "author",
      attachedId: author._id,
    });

    await invalidateBlogCaches();
    return res.status(201).json({
      success: true,
      message: "Author created",
      data: { author },
    });
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 11000 ? "Author slug is already in use" : error.message,
    });
  }
};

export const adminUpdateAuthor = async (req, res) => {
  try {
    const existingAuthor = await BlogAuthor.findById(req.params.authorId).lean();
    if (!existingAuthor) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    const avatarPublicId = normalisePublicId(req.body.avatar?.public_id);
    const mediaSessionId = cleanMediaSessionId(req.body.mediaSessionId);
    const updates = {
      name: String(req.body.name || "").trim(),
      slug: toSlug(req.body.slug || req.body.name),
      title: String(req.body.title || "").trim(),
      bio: String(req.body.bio || "").trim(),
      avatar: {
        url: normaliseOptionalUrl(req.body.avatar?.url),
        public_id: avatarPublicId,
        alt: String(req.body.avatar?.alt || req.body.name || "").trim().slice(0, 140),
      },
      socialLinks: req.body.socialLinks || {},
      isActive: req.body.isActive !== false,
    };

    const author = await BlogAuthor.findByIdAndUpdate(req.params.authorId, updates, {
      new: true,
      runValidators: true,
    });

    await attachBlogMedia({
      adminId: req.admin.userId,
      sessionId: mediaSessionId,
      publicIds: avatarPublicId ? new Set([avatarPublicId]) : new Set(),
      kind: "author",
      attachedId: author._id,
    });

    if (
      existingAuthor.avatar?.public_id &&
      existingAuthor.avatar.public_id !== avatarPublicId
    ) {
      await destroyCloudinaryMedia({
        public_id: existingAuthor.avatar.public_id,
        resource_type: "image",
      });
      await BlogMedia.updateOne(
        { public_id: existingAuthor.avatar.public_id },
        { status: "deleted", deletedAt: new Date() },
      ).catch(() => {});
    }

    await invalidateBlogCaches();
    return res.status(200).json({
      success: true,
      message: "Author updated",
      data: { author },
    });
  } catch (error) {
    const status = error.code === 11000 ? 409 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 11000 ? "Author slug is already in use" : error.message,
    });
  }
};

export const adminDeleteAuthor = async (req, res) => {
  try {
    const postCount = await BlogPost.countDocuments({ author: req.params.authorId });
    if (postCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Move or delete this author's posts before deleting the author",
      });
    }

    const author = await BlogAuthor.findByIdAndDelete(req.params.authorId);
    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    if (author.avatar?.public_id) {
      await destroyCloudinaryMedia({
        public_id: author.avatar.public_id,
        resource_type: "image",
      });
      await BlogMedia.updateOne(
        { public_id: author.avatar.public_id },
        { status: "deleted", deletedAt: new Date() },
      ).catch(() => {});
    }

    await invalidateBlogCaches();
    return res.status(200).json({ success: true, message: "Author deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete author" });
  }
};

export const adminListComments = async (req, res) => {
  try {
    const comments = await BlogComment.find({})
      .populate("post", "title slug")
      .populate("user", "name username email")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return res.status(200).json({ success: true, data: { comments } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load comments" });
  }
};

export const adminUpdateCommentStatus = async (req, res) => {
  try {
    const status = ["visible", "hidden", "removed"].includes(req.body.status)
      ? req.body.status
      : "hidden";
    const comment = await BlogComment.findByIdAndUpdate(
      req.params.commentId,
      { status },
      { new: true },
    ).populate("post", "slug");

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    await redisClient.del(`blogs:post:${comment.post?.slug}`).catch(() => {});
    return res.status(200).json({
      success: true,
      message: "Comment updated",
      data: { comment },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update comment" });
  }
};
