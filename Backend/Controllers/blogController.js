import crypto from "crypto";
import DOMPurify from "isomorphic-dompurify";
import BlogAuthor from "../Models/BlogAuthor.js";
import BlogPost from "../Models/BlogPost.js";
import BlogComment from "../Models/BlogComment.js";
import ContactInfo from "../Models/ContactInfo.js";
import redisClient from "../Config/redis.js";
import {
  decryptBlogPayload,
  encryptBlogPayload,
  hashBlogPayload,
} from "../utils/blogCrypto.js";

const BLOG_CACHE_TTL = 300;
const BLOG_BASE_URL =
  process.env.BLOGS_SITE_URL || "https://blogs.vidhgrow.online";

const allowedVideoHosts = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "www.dailymotion.com",
  "dailymotion.com",
];

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

const sanitizeBlogHtml = (html = "") => {
  const cleaned = DOMPurify.sanitize(String(html), {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "target",
      "rel",
      "loading",
      "data-align",
      "data-width",
      "allow",
      "allowfullscreen",
      "frameborder",
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
  );
};

const normaliseTags = (tags = []) =>
  [...new Set((Array.isArray(tags) ? tags : String(tags).split(","))
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12))]
    .map((tag) => tag.slice(0, 40));

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

const cleanComment = (value = "") =>
  stripHtml(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

export const listPublishedBlogs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(24, Math.max(1, Number(req.query.limit || 10)));
    const tag = req.query.tag ? String(req.query.tag).toLowerCase() : null;
    const cacheKey = `blogs:list:${page}:${limit}:${tag || "all"}`;

    const cached = await redisClient.get(cacheKey).catch(() => null);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const query = getPublishedQuery();
    if (tag) query.tags = tag;

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

    await redisClient.setex(cacheKey, BLOG_CACHE_TTL, JSON.stringify(response)).catch(() => {});
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

    const response = {
      success: true,
      data: {
        post: serializePost(post, { includeContent: true }),
        comments: commentTree,
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

    const [posts, authors] = await Promise.all([
      BlogPost.find(getPublishedQuery()).select("slug updatedAt publishedAt").lean(),
      BlogAuthor.find({ isActive: true }).select("slug updatedAt").lean(),
    ]);

    const urls = [
      {
        loc: BLOG_BASE_URL,
        lastmod: new Date().toISOString(),
        changefreq: "daily",
        priority: "1.0",
      },
      ...posts.map((post) => ({
        loc: `${BLOG_BASE_URL}/${post.slug}`,
        lastmod: new Date(post.updatedAt || post.publishedAt).toISOString(),
        changefreq: "weekly",
        priority: "0.8",
      })),
      ...authors.map((author) => ({
        loc: `${BLOG_BASE_URL}/author/${author.slug}`,
        lastmod: new Date(author.updatedAt).toISOString(),
        changefreq: "monthly",
        priority: "0.5",
      })),
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
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

export const adminListBlogPosts = async (req, res) => {
  try {
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
  const title = String(body.title || "").trim();
  const slug = toSlug(body.slug || title);
  const excerpt = String(body.excerpt || "").trim();
  const contentHtml = sanitizeBlogHtml(body.contentHtml || "");
  const stats = calculateStats(contentHtml);
  const status = ["draft", "scheduled", "published", "archived"].includes(
    body.status,
  )
    ? body.status
    : "draft";

  if (title.length < 5) throw new Error("Title must be at least 5 characters");
  if (slug.length < 5) throw new Error("Slug must be at least 5 characters");
  if (excerpt.length < 40) throw new Error("Excerpt must be at least 40 characters");
  if (!stripHtml(contentHtml)) throw new Error("Blog content is required");
  if (!body.author) throw new Error("Author is required");
  if (!body.coverImage?.url || !body.coverImage?.alt) {
    throw new Error("Cover image URL and alt text are required");
  }

  const author = await BlogAuthor.findOne({ _id: body.author, isActive: true });
  if (!author) throw new Error("Selected author was not found");

  const seo = body.seo || {};
  const robots = seo.robots || {};
  const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  const publishedAt =
    status === "published"
      ? existingPost?.publishedAt || new Date()
      : status === "scheduled"
        ? scheduledFor
        : existingPost?.publishedAt || null;

  return {
    title,
    slug,
    excerpt,
    status,
    author: author._id,
    coverImage: {
      url: String(body.coverImage.url).trim(),
      alt: String(body.coverImage.alt).trim(),
      placement: ["hero", "inline", "wide"].includes(body.coverImage.placement)
        ? body.coverImage.placement
        : "hero",
    },
    contentEncrypted: encryptBlogPayload({ contentHtml }),
    contentHash: hashBlogPayload({ contentHtml }),
    plainTextPreview: stats.plainText.slice(0, 500),
    h1: stats.h1 || title,
    wordCount: stats.wordCount,
    readingTimeMinutes: stats.readingTimeMinutes,
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
    const payload = await buildPostPayload(req.body, req.admin.userId);
    const post = await BlogPost.create({
      ...payload,
      createdBy: req.admin.userId,
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

    const payload = await buildPostPayload(req.body, req.admin.userId, existingPost);
    const post = await BlogPost.findByIdAndUpdate(req.params.postId, payload, {
      new: true,
      runValidators: true,
    });

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
    if (name.length < 2) throw new Error("Author name is required");
    if (slug.length < 2) throw new Error("Author slug is required");

    const author = await BlogAuthor.create({
      name,
      slug,
      title: String(req.body.title || "").trim(),
      bio: String(req.body.bio || "").trim(),
      avatar: req.body.avatar || {},
      socialLinks: req.body.socialLinks || {},
      isActive: req.body.isActive !== false,
      createdBy: req.admin.userId,
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
    const updates = {
      name: String(req.body.name || "").trim(),
      slug: toSlug(req.body.slug || req.body.name),
      title: String(req.body.title || "").trim(),
      bio: String(req.body.bio || "").trim(),
      avatar: req.body.avatar || {},
      socialLinks: req.body.socialLinks || {},
      isActive: req.body.isActive !== false,
    };

    const author = await BlogAuthor.findByIdAndUpdate(req.params.authorId, updates, {
      new: true,
      runValidators: true,
    });

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
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
