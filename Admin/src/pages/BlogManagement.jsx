import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AlignCenter,
  AlignLeft,
  AlertTriangle,
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  HelpCircle,
  Image,
  Italic,
  Keyboard,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageSquare,
  Monitor,
  Palette,
  Plus,
  Quote,
  Save,
  Search,
  Smartphone,
  Tablet,
  Trash2,
  Type,
  Underline,
  UploadCloud,
  UserRound,
  Video,
  X,
} from "lucide-react";

const BLOG_URL = "https://blogs.vidhgrow.online";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 10 * 1024 * 1024;

const emptyAuthor = {
  name: "",
  slug: "",
  title: "",
  bio: "",
  avatar: { url: "", public_id: "", alt: "" },
  socialLinks: { website: "", twitter: "", linkedin: "", instagram: "" },
  isActive: true,
};

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  status: "draft",
  author: "",
  coverImage: { url: "", public_id: "", resource_type: "image", alt: "", placement: "hero" },
  contentHtml:
    "<h2>Start with the important update</h2><p>Write the opening like a clear product note: what changed, who it helps, and what the reader can do next.</p>",
  tags: [],
  category: "platform",
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    canonicalUrl: "",
    robots: {
      index: true,
      follow: true,
      maxSnippet: -1,
      maxImagePreview: "large",
    },
  },
  social: {
    shareTitle: "",
    shareDescription: "",
  },
};

const steps = [
  { id: "setup", label: "Setup", description: "Title, slug, author, cover" },
  { id: "body", label: "Body", description: "Writing, links, media" },
  { id: "seo", label: "SEO", description: "Search and sharing" },
  { id: "preview", label: "Preview", description: "Full page check" },
];

const slugify = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 160);

const stripHtml = (html = "") =>
  html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const countWords = (html = "") => {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).length : 0;
};

const blogPostUrl = (slug = "") => `${BLOG_URL}/${slugify(slug) || "slug"}`;

const splitList = (value) =>
  Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const formatBytes = (bytes = 0) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const isHttpUrl = (value = "") => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

const SLUG_CHECK_TIMEOUT_MS = 3500;
const TEXT_SIZE_OPTIONS = [
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "30", value: "30px" },
  { label: "36", value: "36px" },
];

const emptyEditorState = {
  bold: false,
  italic: false,
  underline: false,
  block: "p",
  fontSize: "18px",
  inQuote: false,
  hasLineBreak: false,
};

const makeMediaSessionId = () =>
  `blog:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

const cleanEditorHtml = (html = "") =>
  String(html)
    .replace(/\sdata-editor-line-break=["'][^"']*["']/gi, "")
    .replace(/\sdata-editor-helper=["'][^"']*["']/gi, "");

const authorFallback = (name = "Vidhgrow") => {
  const letter = String(name).trim().charAt(0).toUpperCase() || "V";
  const palette = [
    ["#dbeafe", "#1d4ed8"],
    ["#dcfce7", "#15803d"],
    ["#fef3c7", "#b45309"],
    ["#fae8ff", "#a21caf"],
    ["#fee2e2", "#b91c1c"],
    ["#e0f2fe", "#0369a1"],
  ];
  const [background, color] = palette[(letter.charCodeAt(0) || 0) % palette.length];
  return { letter, background, color };
};

const renderAvatarPreview = (author, size = "h-12 w-12 text-lg") => {
  const name = author?.name || "Author";
  if (author?.avatar?.url) {
    return (
      <img
        src={author.avatar.url}
        alt={author.avatar.alt || name}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  const fallback = authorFallback(name);
  return (
    <span
      className={`${size} inline-flex items-center justify-center rounded-full font-extrabold`}
      style={{ backgroundColor: fallback.background, color: fallback.color }}
    >
      {fallback.letter}
    </span>
  );
};

const normaliseVideoEmbedUrl = (value = "") => {
  if (!isHttpUrl(value)) return "";

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return `https://www.youtube.com/embed/${parsed.pathname.replace("/", "")}`;
    }

    if (host === "youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) return parsed.toString();
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (host === "vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }

    if (host === "player.vimeo.com" || host === "dailymotion.com") {
      return parsed.toString();
    }

    if (host === "www.dailymotion.com") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
};

const buildRelatedPreviewPosts = (post, posts = []) => {
  const currentSlug = post.slug;
  const postTags = new Set(splitList(post.tags).map((tag) => tag.toLowerCase()));

  const scored = posts
    .filter((item) => item.slug && item.slug !== currentSlug)
    .map((item) => {
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const tagScore = itemTags.filter((tag) => postTags.has(String(tag).toLowerCase())).length;
      const authorScore =
        item.author?._id && post.author && item.author._id === post.author ? 2 : 0;
      const categoryScore = item.category && item.category === post.category ? 1 : 0;
      return { item, score: tagScore + authorScore + categoryScore };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ item }) => item);
};

const buildPreviewHtml = (post, author, relatedPosts = []) => {
  const title = post.title || "Untitled draft";
  const excerpt = post.excerpt || "Add a concise summary before publishing.";
  const cover = post.coverImage?.url || "";
  const authorName = author?.name || "Vidhgrow Editorial";
  const fallback = authorFallback(authorName);
  const avatar = author?.avatar?.url
    ? `<img class="avatar" src="${author.avatar.url}" alt="${author.avatar.alt || authorName}" />`
    : `<span class="avatar initial" style="background:${fallback.background};color:${fallback.color};">${fallback.letter}</span>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:linear-gradient(180deg,#f8fbff 0,#fff 360px);color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
    .shell{max-width:1120px;margin:0 auto;padding:28px 22px 72px;}
    header{border-bottom:1px solid #e5e7eb;padding:0 0 18px;margin-bottom:42px;display:flex;justify-content:space-between;gap:18px;align-items:center}
    .brand{font-weight:850;color:#111827}.brand em{font-style:normal;color:#2563eb}
    .meta{font-size:13px;color:#64748b}
    article{max-width:780px;margin:0 auto;}
    h1{font-size:clamp(34px,6vw,64px);line-height:1.02;margin:0 0 18px;letter-spacing:0;font-weight:850;color:#111827;}
    .excerpt{font-size:19px;line-height:1.7;color:#475569;margin:0 0 26px;}
    .byline{display:flex;gap:12px;align-items:center;margin:24px 0 34px;color:#475569;font-size:14px;}
    .avatar{width:46px;height:46px;border-radius:999px;object-fit:cover;flex:0 0 auto}.initial{display:inline-flex;align-items:center;justify-content:center;font-weight:850}
    .cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;margin:0 0 36px;background:#e5e7eb;}
    .content{font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:1.85;color:#1f2937;}
    .content h1,.content h2,.content h3{font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.14;color:#111827;margin:38px 0 14px;letter-spacing:0}
    .content h1{font-size:38px}.content h2{font-size:30px}.content h3{font-size:24px}
    .content a{color:#2563eb;text-decoration-thickness:2px;text-underline-offset:4px}
    .content blockquote{border-left:4px solid #3b82f6;margin:34px 0;padding:8px 0 8px 22px;color:#334155;font-style:italic;background:#eff6ff}
    .content ul,.content ol{padding-left:1.45em;margin:22px 0}.content li{margin:8px 0;padding-left:.25em}
    .content img{max-width:100%;border-radius:6px;display:block;margin:30px auto}
    .content figure{margin:34px 0}.content figcaption{font-size:14px;color:#64748b;text-align:center;margin-top:10px}
    .content iframe,.content video{width:100%;aspect-ratio:16/9;border:0;border-radius:6px;margin:30px 0;background:#111827}
    .related{max-width:980px;margin:64px auto 0;border-top:1px solid #e5e7eb;padding-top:30px}
    .related-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}
    .related-head h2{font-size:24px;line-height:1.2;margin:0;color:#111827}
    .related-head p{margin:6px 0 0;color:#64748b;font-size:14px}
    .related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
    .related-card{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff}
    .related-card img,.related-card .related-empty{width:100%;aspect-ratio:16/10;object-fit:cover;background:#eef2ff;display:block}
    .related-card div{padding:14px}
    .related-card h3{font-size:16px;line-height:1.35;margin:0 0 8px;color:#111827}
    .related-card p{font-size:13px;line-height:1.55;margin:0;color:#64748b}
    .related-card a{color:inherit;text-decoration:none}
    @media(max-width:640px){.shell{padding:20px 16px 56px}.content{font-size:18px}header{align-items:flex-start;flex-direction:column}}
    @media(max-width:760px){.related-head{display:block}.related-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="shell">
    <header><div class="brand">Vidhgrow <em>Blogs</em></div><div class="meta">${post.category || "platform"}</div></header>
    <article>
      <h1>${title}</h1>
      <p class="excerpt">${excerpt}</p>
      <div class="byline">${avatar}<div><strong>${authorName}</strong><br/><span>${Math.max(1, Math.ceil(countWords(post.contentHtml) / 220))} min read</span></div></div>
      ${cover ? `<img class="cover" src="${cover}" alt="${post.coverImage?.alt || title}" />` : ""}
      <div class="content">${post.contentHtml || ""}</div>
    </article>
    <section class="related" aria-labelledby="related-title">
      <div class="related-head">
        <div>
          <h2 id="related-title">Related blogs</h2>
          <p>Shown after the article to keep readers moving through useful platform updates.</p>
        </div>
      </div>
      <div class="related-grid">
        ${
          (relatedPosts.length
            ? relatedPosts
            : [
                { title: "Related platform update", excerpt: "A matching blog card will appear here after more posts are published.", coverImage: {} },
                { title: "Course builder note", excerpt: "Related cards use shared tags, category, or author when possible.", coverImage: {} },
                { title: "Teacher workflow story", excerpt: "This preview shows the final page structure even for a draft.", coverImage: {} },
              ]
          )
            .map(
              (item) => `<article class="related-card">
                ${
                  item.coverImage?.url
                    ? `<img src="${item.coverImage.url}" alt="${item.coverImage.alt || item.title}" />`
                    : `<span class="related-empty"></span>`
                }
                <div>
                  <h3>${item.slug ? `<a href="/${item.slug}">${item.title}</a>` : item.title}</h3>
                  <p>${item.excerpt || "Related blog summary."}</p>
                </div>
              </article>`,
            )
            .join("")
        }
      </div>
    </section>
  </div>
</body>
</html>`;
};

const buildSnapshot = (post) =>
  JSON.stringify({
    ...post,
    tags: splitList(post.tags),
    seo: { ...post.seo, keywords: splitList(post.seo.keywords) },
  });

const BlogManagement = () => {
  const editorRef = useRef(null);
  const pendingActionRef = useRef(null);
  const postSlugRequestRef = useRef(null);
  const authorSlugRequestRef = useRef(null);
  const postSlugSeqRef = useRef(0);
  const authorSlugSeqRef = useRef(0);
  const slugCheckCacheRef = useRef(new Map());
  const originalPostSlugRef = useRef("");
  const originalAuthorSlugRef = useRef("");
  const editorInitialHtmlRef = useRef(emptyPost.contentHtml);
  const mediaSessionRef = useRef(makeMediaSessionId());
  const selectionRangeRef = useRef(null);
  const [tab, setTab] = useState("posts");
  const [step, setStep] = useState(0);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAuthor, setSavingAuthor] = useState(false);
  const [showAuthorForm, setShowAuthorForm] = useState(false);
  const [postForm, setPostForm] = useState(emptyPost);
  const [editingPostId, setEditingPostId] = useState(null);
  const [baseline, setBaseline] = useState(buildSnapshot(emptyPost));
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState({ status: "idle", message: "" });
  const [slugRetryKey, setSlugRetryKey] = useState(0);
  const [authorForm, setAuthorForm] = useState(emptyAuthor);
  const [editingAuthorId, setEditingAuthorId] = useState(null);
  const [authorSlugTouched, setAuthorSlugTouched] = useState(false);
  const [authorSlugState, setAuthorSlugState] = useState({ status: "idle", message: "" });
  const [authorSlugRetryKey, setAuthorSlugRetryKey] = useState(0);
  const [previewSize, setPreviewSize] = useState("desktop");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDraft, setImageDraft] = useState({ file: null, url: "", alt: "", align: "wide" });
  const [videoDraft, setVideoDraft] = useState({ file: null, url: "", title: "" });
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#dbeafe");
  const [editorState, setEditorState] = useState(emptyEditorState);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [uploading, setUploading] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);

  const selectedAuthor = authors.find((author) => author._id === postForm.author);
  const isDirty = buildSnapshot(postForm) !== baseline;
  const automaticPostUrl = blogPostUrl(postForm.slug);
  const automaticShareTitle = postForm.social.shareTitle || postForm.seo.metaTitle || postForm.title || "Vidhgrow blog";
  const automaticShareDescription = postForm.social.shareDescription || postForm.seo.metaDescription || postForm.excerpt || "";

  const buildSeoChecks = useCallback(
    (candidate = postForm) => {
      const contentHtml = cleanEditorHtml(candidate.contentHtml || "");
      const wordCount = countWords(contentHtml);
      const metaTitle = candidate.seo.metaTitle || candidate.title;
      const metaDescription = candidate.seo.metaDescription || candidate.excerpt;
      const slugReady =
        slugState.status === "available" ||
        (editingPostId && !["checking", "taken", "error"].includes(slugState.status));

      return [
        ["Meta title between 35 and 70 characters", metaTitle.length >= 35 && metaTitle.length <= 70],
        ["Meta description between 70 and 170 characters", metaDescription.length >= 70 && metaDescription.length <= 170],
        ["At least 250 words for long-form ranking", wordCount >= 250],
        ["Cover image and meaningful alt text", !!candidate.coverImage.url && candidate.coverImage.alt.length >= 8],
        ["Slug checked and available", slugReady],
        ["Author selected", !!candidate.author],
      ];
    },
    [editingPostId, postForm, slugState.status],
  );

  const seoChecks = useMemo(() => buildSeoChecks(postForm), [buildSeoChecks, postForm]);

  const syncEditorContentIntoForm = useCallback(() => {
    if (!editorRef.current) return postForm.contentHtml;
    const html = cleanEditorHtml(editorRef.current.innerHTML);
    editorInitialHtmlRef.current = html;
    setPostForm((prev) => (prev.contentHtml === html ? prev : { ...prev, contentHtml: html }));
    return html;
  }, [postForm.contentHtml]);

  const currentSeoChecks = useCallback(
    (candidate = postForm) => {
      const html = editorRef.current ? cleanEditorHtml(editorRef.current.innerHTML) : candidate.contentHtml;
      return buildSeoChecks({ ...candidate, contentHtml: html });
    },
    [buildSeoChecks, postForm],
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [postsRes, authorsRes, commentsRes] = await Promise.all([
        axios.get("/blogs/admin/posts"),
        axios.get("/blogs/admin/authors"),
        axios.get("/blogs/admin/comments"),
      ]);
      setPosts(postsRes.data.data.posts || []);
      setAuthors(authorsRes.data.data.authors || []);
      setComments(commentsRes.data.data.comments || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load blog workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!slugTouched && postForm.title) {
      setPostForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [postForm.title, slugTouched]);

  useEffect(() => {
    const slug = postForm.slug.trim();
    postSlugRequestRef.current?.abort();
    const requestId = ++postSlugSeqRef.current;

    if (!slug || slug.length < 5) {
      setSlugState({ status: "idle", message: "Use at least 5 characters" });
      return;
    }

    if (editingPostId && originalPostSlugRef.current && slug === originalPostSlugRef.current) {
      setSlugState({ status: "available", message: "Current blog slug" });
      return;
    }

    const cacheKey = `post:${editingPostId || "new"}:${slug}`;
    const cached = slugCheckCacheRef.current.get(cacheKey);
    if (cached) {
      setSlugState(cached);
      return;
    }

    setSlugState((prev) =>
      prev.status === "checking" ? prev : { status: "idle", message: `${BLOG_URL}/${slug}` },
    );

    const timer = window.setTimeout(async () => {
      const controller = new AbortController();
      postSlugRequestRef.current = controller;

      try {
        setSlugState({ status: "checking", message: "Checking slug..." });
        const res = await axios.get("/blogs/admin/slugs/check", {
          params: {
            type: "post",
            slug,
            excludeId: editingPostId || undefined,
          },
          signal: controller.signal,
          timeout: SLUG_CHECK_TIMEOUT_MS,
        });
        const data = res.data.data;
        if (controller.signal.aborted || requestId !== postSlugSeqRef.current) return;
        const nextState = {
          status: data.available ? "available" : "taken",
          message: data.available ? "Slug is available" : data.reason || "Slug is already in use",
        };
        slugCheckCacheRef.current.set(cacheKey, nextState);
        setSlugState(nextState);
      } catch (error) {
        if (isCanceledRequest(error) || requestId !== postSlugSeqRef.current) return;
        setSlugState({
          status: "error",
          message:
            error.response?.data?.message ||
            "Slug check did not respond. You can retry, or save draft and the backend will still validate it.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      postSlugRequestRef.current?.abort();
    };
  }, [editingPostId, postForm.slug, slugRetryKey]);

  useEffect(() => {
    if (!authorSlugTouched && authorForm.name) {
      setAuthorForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
    }
  }, [authorForm.name, authorSlugTouched]);

  useEffect(() => {
    const slug = authorForm.slug.trim();
    authorSlugRequestRef.current?.abort();
    const requestId = ++authorSlugSeqRef.current;

    if (!slug || slug.length < 2) {
      setAuthorSlugState({ status: "idle", message: "Use at least 2 characters" });
      return;
    }

    if (editingAuthorId && originalAuthorSlugRef.current && slug === originalAuthorSlugRef.current) {
      setAuthorSlugState({ status: "available", message: "Current author slug" });
      return;
    }

    const cacheKey = `author:${editingAuthorId || "new"}:${slug}`;
    const cached = slugCheckCacheRef.current.get(cacheKey);
    if (cached) {
      setAuthorSlugState(cached);
      return;
    }

    setAuthorSlugState((prev) =>
      prev.status === "checking"
        ? prev
        : { status: "idle", message: `${BLOG_URL}/author/${slug}` },
    );

    const timer = window.setTimeout(async () => {
      const controller = new AbortController();
      authorSlugRequestRef.current = controller;

      try {
        setAuthorSlugState({ status: "checking", message: "Checking slug..." });
        const res = await axios.get("/blogs/admin/slugs/check", {
          params: {
            type: "author",
            slug,
            excludeId: editingAuthorId || undefined,
          },
          signal: controller.signal,
          timeout: SLUG_CHECK_TIMEOUT_MS,
        });
        const data = res.data.data;
        if (controller.signal.aborted || requestId !== authorSlugSeqRef.current) return;
        const nextState = {
          status: data.available ? "available" : "taken",
          message: data.available ? "Author slug is available" : data.reason || "Author slug is already in use",
        };
        slugCheckCacheRef.current.set(cacheKey, nextState);
        setAuthorSlugState(nextState);
      } catch (error) {
        if (isCanceledRequest(error) || requestId !== authorSlugSeqRef.current) return;
        setAuthorSlugState({
          status: "error",
          message:
            error.response?.data?.message ||
            "Author slug check did not respond. You can retry, or save and the backend will still validate it.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      authorSlugRequestRef.current?.abort();
    };
  }, [authorForm.slug, editingAuthorId, authorSlugRetryKey]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updatePost = (path, value) => {
    setPostForm((prev) => {
      const next = structuredClone(prev);
      const parts = path.split(".");
      let target = next;
      parts.slice(0, -1).forEach((part) => {
        target[part] = target[part] || {};
        target = target[part];
      });
      target[parts.at(-1)] = value;
      return next;
    });
  };

  const updateAuthor = (path, value) => {
    setAuthorForm((prev) => {
      const next = structuredClone(prev);
      const parts = path.split(".");
      let target = next;
      parts.slice(0, -1).forEach((part) => {
        target[part] = target[part] || {};
        target = target[part];
      });
      target[parts.at(-1)] = value;
      return next;
    });
  };

  const getSelectionElement = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;
    const node = selection.anchorNode;
    if (!node || !editorRef.current.contains(node)) return null;
    return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  }, []);

  const getClosestBlock = useCallback((element) => {
    if (!element || !editorRef.current) return null;
    return element.closest("h1,h2,h3,blockquote,p,li,div") || editorRef.current;
  }, []);

  const saveEditorSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;
    selectionRangeRef.current = range.cloneRange();
  }, []);

  const restoreEditorSelection = useCallback(() => {
    if (!selectionRangeRef.current || !editorRef.current) return false;
    if (!editorRef.current.contains(selectionRangeRef.current.commonAncestorContainer)) {
      selectionRangeRef.current = null;
      return false;
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectionRangeRef.current);
    return true;
  }, []);

  const holdEditorSelection = (event) => {
    event.preventDefault();
    restoreEditorSelection();
  };

  const updateEditorState = useCallback(() => {
    if (!editorRef.current) return;
    const element = getSelectionElement();
    if (!element) {
      setEditorState((prev) => ({ ...prev, bold: false, italic: false, underline: false }));
      return;
    }

    const block = getClosestBlock(element);
    const blockTag = block?.tagName?.toLowerCase() || "p";
    const computed = window.getComputedStyle(element);
    setEditorState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      block: ["h1", "h2", "h3", "blockquote", "li"].includes(blockTag) ? blockTag : "p",
      fontSize: computed.fontSize || "18px",
      inQuote: !!element.closest("blockquote"),
      hasLineBreak: !!block?.querySelector?.("br[data-editor-line-break='true']"),
    });
  }, [getClosestBlock, getSelectionElement]);

  const syncEditor = () => {
    if (editorRef.current) {
      const html = cleanEditorHtml(editorRef.current.innerHTML);
      editorInitialHtmlRef.current = html;
      updatePost("contentHtml", html);
      saveEditorSelection();
      updateEditorState();
    }
  };

  useEffect(() => {
    if (step !== 1 || !editorRef.current) return;
    editorRef.current.innerHTML = editorInitialHtmlRef.current || "";
    window.setTimeout(updateEditorState, 0);
  }, [editorResetKey, step, updateEditorState]);

  useEffect(() => {
    const handleSelectionChange = () => {
      saveEditorSelection();
      updateEditorState();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [saveEditorSelection, updateEditorState]);

  const command = (name, value = null) => {
    restoreEditorSelection();
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    syncEditor();
    window.setTimeout(updateEditorState, 0);
  };

  const replaceBlockTag = (block, tag) => {
    if (!block || block === editorRef.current) return null;
    if (block.tagName?.toLowerCase() === tag) return block;

    const next = document.createElement(tag);
    Array.from(block.attributes || []).forEach((attr) => {
      if (!["style", "class"].includes(attr.name)) return;
      next.setAttribute(attr.name, attr.value);
    });
    next.innerHTML = block.innerHTML || "<br>";
    block.replaceWith(next);
    return next;
  };

  const currentRange = () => {
    restoreEditorSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return null;
    const range = selection.getRangeAt(0);
    return editorRef.current.contains(range.commonAncestorContainer) ? range : null;
  };

  const selectedBlocks = (range) => {
    if (!editorRef.current) return [];
    const blocks = new Set();
    const startElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    const endElement =
      range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : range.endContainer;

    [getClosestBlock(startElement), getClosestBlock(endElement)].forEach((block) => {
      if (block && block !== editorRef.current) blocks.add(block);
    });

    editorRef.current
      .querySelectorAll("p,h1,h2,h3,blockquote,li,div")
      .forEach((block) => {
        try {
          if (range.intersectsNode(block)) blocks.add(block);
        } catch {
          // Ignore detached nodes while the editor is changing.
        }
      });

    return [...blocks].filter((block) => editorRef.current.contains(block));
  };

  const formatSelectedBlocks = (tag) => {
    editorRef.current?.focus();
    const range = currentRange();
    if (!range) return;

    const blocks = selectedBlocks(range);
    const changedBlocks = blocks
      .map((block) => replaceBlockTag(block, tag))
      .filter(Boolean);

    if (changedBlocks.length) {
      placeCaretInside(changedBlocks.at(-1));
      saveEditorSelection();
      syncEditor();
      window.setTimeout(updateEditorState, 0);
    }
  };

  const indentSelectedBlocks = (direction = 1) => {
    editorRef.current?.focus();
    const range = currentRange();
    if (!range) return false;

    const blocks = selectedBlocks(range);
    if (!blocks.length || range.collapsed) return false;

    blocks.forEach((block) => {
      const current = Number.parseInt(block.style.marginLeft || "0", 10) || 0;
      const next = Math.max(0, current + direction * 32);
      block.style.marginLeft = next ? `${next}px` : "";
    });
    placeCaretInside(blocks.at(-1));
    saveEditorSelection();
    syncEditor();
    return true;
  };

  const insertFourSpaces = () => {
    command("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
  };

  const toggleList = (type) => {
    const commandName = type === "ordered" ? "insertOrderedList" : "insertUnorderedList";
    const listTag = type === "ordered" ? "ol" : "ul";
    editorRef.current?.focus();
    const beforeRange = currentRange();
    if (!beforeRange) return;

    document.execCommand(commandName, false, null);
    const element = getSelectionElement();

    if (!element?.closest(listTag)) {
      const block = getClosestBlock(element) || getClosestBlock(beforeRange.startContainer.parentElement);
      if (block && block !== editorRef.current) {
        const list = document.createElement(listTag);
        const item = document.createElement("li");
        item.innerHTML = block.innerHTML || "<br>";
        list.appendChild(item);
        block.replaceWith(list);
        placeCaretInside(item);
      } else if (editorRef.current) {
        const list = document.createElement(listTag);
        const item = document.createElement("li");
        item.innerHTML = "<br>";
        list.appendChild(item);
        editorRef.current.appendChild(list);
        placeCaretInside(item);
      }
    }

    syncEditor();
    window.setTimeout(updateEditorState, 0);
  };

  const activeToolClass = (active) =>
    `rounded border p-2 transition ${
      active
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    }`;

  const blockButtonClass = (block) =>
    `rounded border px-3 py-2 text-xs font-bold transition ${
      editorState.block === block
        ? "border-blue-600 bg-blue-600 text-white"
        : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
    }`;

  const wrapSelectedText = (styles = {}, emptyMessage = "Select text first") => {
    restoreEditorSelection();
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.info(emptyMessage);
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return false;

    const span = document.createElement("span");
    Object.entries(styles).forEach(([key, value]) => {
      span.style[key] = value;
    });
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    syncEditor();
    return true;
  };

  const setTextSize = (fontSize) => {
    wrapSelectedText({ fontSize }, "Select text first, then choose a size");
  };

  const setFontFamily = (fontFamily) => {
    wrapSelectedText({ fontFamily }, "Select text first, then choose a font");
  };

  const placeCaretInside = (node) => {
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const insertParagraphAfterBlock = (block) => {
    if (!editorRef.current) return false;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";

    if (!block || block === editorRef.current || !editorRef.current.contains(block)) {
      editorRef.current.appendChild(paragraph);
    } else {
      block.insertAdjacentElement("afterend", paragraph);
    }

    placeCaretInside(paragraph);
    syncEditor();
    return true;
  };

  const exitQuoteBlock = () => {
    const element = getSelectionElement();
    const quote = element?.closest("blockquote");
    return quote ? insertParagraphAfterBlock(quote) : false;
  };

  const insertVisibleLineBreak = () => {
    command("insertHTML", '<br data-editor-line-break="true">');
  };

  const handleEditorKeyDown = (event) => {
    if (event.key === "?" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      setShowShortcutModal(true);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (event.shiftKey) {
        if (!indentSelectedBlocks(-1)) command("outdent");
        return;
      }
      if (!indentSelectedBlocks(1)) insertFourSpaces();
      return;
    }

    if (event.key !== "Enter") return;

    if (event.shiftKey) {
      event.preventDefault();
      insertVisibleLineBreak();
      return;
    }

    const element = getSelectionElement();
    const block = getClosestBlock(element);
    const blockTag = block?.tagName?.toLowerCase();

    if (editorState.inQuote || element?.closest("blockquote")) {
      event.preventDefault();
      exitQuoteBlock();
      return;
    }

    if (["h1", "h2", "h3"].includes(blockTag)) {
      event.preventDefault();
      insertParagraphAfterBlock(block);
      return;
    }

    if ((!block || block === editorRef.current) && editorRef.current && !stripHtml(editorRef.current.innerHTML)) {
      event.preventDefault();
      insertParagraphAfterBlock(editorRef.current);
    }
  };

  const guardUnsaved = (action) => {
    if (!isDirty) {
      action();
      return;
    }

    pendingActionRef.current = action;
    setConfirmModal(true);
  };

  const runPendingAction = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setConfirmModal(false);
    action?.();
  };

  const resetMediaSession = () => {
    mediaSessionRef.current = makeMediaSessionId();
  };

  const discardPendingMedia = async () => {
    const sessionId = mediaSessionRef.current;
    resetMediaSession();
    try {
      await axios.delete("/blogs/admin/media", {
        data: { sessionId },
      });
    } catch (error) {
      console.warn("Pending blog media cleanup failed:", error.response?.data?.message || error.message);
    }
  };

  const discardAndRunPendingAction = async () => {
    await discardPendingMedia();
    runPendingAction();
  };

  const resetPostForm = (authorId = authors[0]?._id || "") => {
    const next = { ...structuredClone(emptyPost), author: authorId };
    resetMediaSession();
    postSlugRequestRef.current?.abort();
    originalPostSlugRef.current = "";
    editorInitialHtmlRef.current = next.contentHtml || "";
    setEditingPostId(null);
    setPostForm(next);
    setBaseline(buildSnapshot(next));
    setSlugTouched(false);
    setSlugState({ status: "idle", message: "Use at least 5 characters" });
    setStep(0);
    setEditorResetKey((value) => value + 1);
  };

  const editPost = (postId) =>
    guardUnsaved(async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/blogs/admin/posts/${postId}`);
        const post = res.data.data.post;
        const next = {
          ...structuredClone(emptyPost),
          ...post,
          author: post.author?._id || post.author || "",
          tags: post.tags || [],
          seo: {
            ...emptyPost.seo,
            ...(post.seo || {}),
            robots: { ...emptyPost.seo.robots, ...(post.seo?.robots || {}) },
          },
          social: { ...emptyPost.social, ...(post.social || {}) },
          coverImage: { ...emptyPost.coverImage, ...(post.coverImage || {}) },
        };
        resetMediaSession();
        postSlugRequestRef.current?.abort();
        originalPostSlugRef.current = next.slug || "";
        editorInitialHtmlRef.current = next.contentHtml || "";
        setEditingPostId(postId);
        setPostForm(next);
        setBaseline(buildSnapshot(next));
        setSlugTouched(true);
        setSlugState({ status: "available", message: "Current blog slug" });
        setStep(0);
        setEditorResetKey((value) => value + 1);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to open post");
      } finally {
        setLoading(false);
      }
    });

  const validatePost = (mode, candidate = postForm) => {
    const slugIsChecking = slugState.status === "checking";
    if (slugIsChecking) return "Wait for the slug check to finish";

    if (mode !== "published") {
      if (candidate.slug && candidate.slug.trim().length < 5) return "Slug must be at least 5 characters";
      if (slugState.status === "taken") return "Choose an available slug";
      return "";
    }

    if (candidate.title.trim().length < 5) return "Title must be at least 5 characters";
    if (candidate.slug.trim().length < 5) return "Slug must be at least 5 characters";
    if (slugState.status === "taken") return "Choose an available slug";
    if (!candidate.author) return "Select an author";
    if (candidate.excerpt.trim().length < 40) return "Excerpt must be at least 40 characters";
    if (!candidate.coverImage.url || !candidate.coverImage.alt.trim()) return "Cover image and alt text are required";
    if (!stripHtml(candidate.contentHtml)) return "Body content is required";
    if (mode === "published" && currentSeoChecks(candidate).some(([, ok]) => !ok)) {
      return "Complete the SEO checks before publishing";
    }
    return "";
  };

  const savePost = async (mode = "draft", options = {}) => {
    if (saving) return false;

    const candidate = {
      ...postForm,
      contentHtml: cleanEditorHtml(editorRef.current?.innerHTML || postForm.contentHtml),
    };
    const validationMessage = validatePost(mode, candidate);
    if (validationMessage) {
      toast.error(validationMessage);
      return false;
    }

    try {
      setSaving(true);
      const payload = {
        ...candidate,
        status: mode,
        publish: mode === "published",
        mediaSessionId: mediaSessionRef.current,
        tags: splitList(candidate.tags),
        seo: {
          ...candidate.seo,
          canonicalUrl: candidate.slug ? blogPostUrl(candidate.slug) : "",
          keywords: splitList(candidate.seo.keywords),
        },
        social: {
          ...candidate.social,
          shareTitle: candidate.social.shareTitle?.trim() || candidate.seo.metaTitle || candidate.title,
          shareDescription: candidate.social.shareDescription?.trim() || candidate.seo.metaDescription || candidate.excerpt,
        },
      };
      const request = editingPostId
        ? axios.put(`/blogs/admin/posts/${editingPostId}`, payload)
        : axios.post("/blogs/admin/posts", payload);
      const res = await request;
      const savedPost = res.data.data.post || {};
      resetMediaSession();
      const savedId = editingPostId || savedPost._id;
      const next = {
        ...candidate,
        title: savedPost.title || candidate.title,
        slug: savedPost.slug || candidate.slug,
        excerpt: savedPost.excerpt ?? candidate.excerpt,
        seo: {
          ...candidate.seo,
          canonicalUrl: payload.seo.canonicalUrl,
          keywords: splitList(candidate.seo.keywords),
        },
        social: payload.social,
        coverImage: { ...candidate.coverImage, ...(savedPost.coverImage || {}) },
        status: mode,
      };
      originalPostSlugRef.current = next.slug || "";
      editorInitialHtmlRef.current = next.contentHtml || "";
      slugCheckCacheRef.current.clear();
      setPostForm(next);
      setEditingPostId(savedId || editingPostId);
      setBaseline(buildSnapshot(next));
      setSlugState({ status: "available", message: "Current blog slug" });
      toast.success(mode === "published" ? "Blog published" : "Draft saved");
      await fetchAll();
      options.after?.();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save blog");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this blog post and its comments?")) return;
    try {
      await axios.delete(`/blogs/admin/posts/${postId}`);
      toast.success("Blog deleted");
      if (editingPostId === postId) resetPostForm();
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete blog");
    }
  };

  const uploadMedia = async (file, kind, purpose) => {
    if (!file) return null;

    const isVideo = kind === "video";
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      toast.error("Video is too large. Maximum size is 10MB");
      return null;
    }
    if (!isVideo && file.size > MAX_IMAGE_SIZE) {
      toast.error("Image is too large. Maximum size is 5MB");
      return null;
    }
    if (isVideo && !["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) {
      toast.error("Only MP4, WebM, and MOV videos are allowed");
      return null;
    }
    if (!isVideo && !["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
      return null;
    }

    try {
      setUploading(purpose);
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(
        `/blogs/admin/media?kind=${kind}&purpose=${purpose}&sessionId=${encodeURIComponent(mediaSessionRef.current)}`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return res.data.data.media;
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
      return null;
    } finally {
      setUploading("");
    }
  };

  const uploadCover = async (file) => {
    const media = await uploadMedia(file, "image", "cover");
    if (!media) return;
    updatePost("coverImage", {
      url: media.url,
      public_id: media.public_id,
      resource_type: media.resource_type,
      alt: postForm.coverImage.alt || postForm.title || media.originalFilename || "Blog cover image",
      placement: "hero",
    });
  };

  const uploadAuthorAvatar = async (file) => {
    const media = await uploadMedia(file, "image", "author-avatar");
    if (!media) return;
    setAuthorForm((prev) => ({
      ...prev,
      avatar: {
        url: media.url,
        public_id: media.public_id,
        alt: prev.avatar.alt || prev.name || "Author avatar",
      },
    }));
  };

  const applyLink = () => {
    const href = linkUrl.trim();
    if (!href) return;
    if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
      toast.error("Links must start with http, https, or mailto");
      return;
    }
    command("createLink", href);
    const links = editorRef.current?.querySelectorAll("a[href]") || [];
    links.forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
    setLinkUrl("");
    syncEditor();
  };

  const insertImage = async () => {
    let media = null;
    if (imageDraft.file) {
      media = await uploadMedia(imageDraft.file, "image", "inline-image");
      if (!media) return;
    }

    const imageUrl = media?.url || imageDraft.url.trim();
    if (!imageUrl || !isHttpUrl(imageUrl) || !imageDraft.alt.trim()) {
      toast.error("Add an image upload or URL and useful alt text");
      return;
    }

    const style =
      imageDraft.align === "left"
        ? "float:left;max-width:46%;margin:8px 24px 16px 0;"
        : imageDraft.align === "right"
          ? "float:right;max-width:46%;margin:8px 0 16px 24px;"
          : "display:block;width:100%;margin:28px auto;";

    command(
      "insertHTML",
      `<figure data-align="${imageDraft.align}"><img src="${imageUrl}" alt="${imageDraft.alt.trim()}" loading="lazy" data-public-id="${media?.public_id || ""}" style="${style}" /><figcaption>${imageDraft.alt.trim()}</figcaption></figure><p></p>`,
    );
    setImageDraft({ file: null, url: "", alt: "", align: "wide" });
  };

  const insertVideo = async () => {
    if (videoDraft.file) {
      const media = await uploadMedia(videoDraft.file, "video", "inline-video");
      if (!media) return;
      command(
        "insertHTML",
        `<video controls controlslist="nodownload noremoteplayback" disablepictureinpicture playsinline preload="metadata" src="${media.url}" data-public-id="${media.public_id}" data-resource-type="video"></video><p></p>`,
      );
      setVideoDraft({ file: null, url: "", title: "" });
      return;
    }

    const embedUrl = normaliseVideoEmbedUrl(videoDraft.url.trim());
    if (!embedUrl) {
      toast.error("Use a trusted YouTube, Vimeo, or Dailymotion URL, or upload a video under 10MB");
      return;
    }

    command(
      "insertHTML",
      `<iframe src="${embedUrl}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><p></p>`,
    );
    setVideoDraft({ file: null, url: "", title: "" });
  };

  const saveAuthor = async () => {
    if (savingAuthor) return;

    if (authorForm.name.trim().length < 2) {
      toast.error("Author name is required");
      return;
    }
    if (!authorForm.slug.trim()) {
      toast.error("Author slug is required");
      return;
    }
    if (authorSlugState.status === "checking") {
      toast.error("Wait for the author slug check to finish");
      return;
    }
    if (authorSlugState.status === "taken") {
      toast.error("Choose an available author slug");
      return;
    }

    try {
      const payload = {
        ...authorForm,
        slug: slugify(authorForm.slug || authorForm.name),
        mediaSessionId: mediaSessionRef.current,
      };
      setSavingAuthor(true);
      const request = editingAuthorId
        ? axios.put(`/blogs/admin/authors/${editingAuthorId}`, payload)
        : axios.post("/blogs/admin/authors", payload);
      await request;
      toast.success(editingAuthorId ? "Author saved" : "Author created");
      resetMediaSession();
      originalAuthorSlugRef.current = "";
      slugCheckCacheRef.current.clear();
      setAuthorForm(emptyAuthor);
      setEditingAuthorId(null);
      setAuthorSlugTouched(false);
      setAuthorSlugState({ status: "idle", message: "" });
      setShowAuthorForm(false);
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save author");
    } finally {
      setSavingAuthor(false);
    }
  };

  const editAuthor = (author) => {
    resetMediaSession();
    authorSlugRequestRef.current?.abort();
    originalAuthorSlugRef.current = author.slug || "";
    setEditingAuthorId(author._id);
    setAuthorSlugTouched(true);
    setAuthorSlugState({ status: "available", message: "Current author slug" });
    setShowAuthorForm(true);
    setAuthorForm({
      ...emptyAuthor,
      ...author,
      avatar: { ...emptyAuthor.avatar, ...(author.avatar || {}) },
      socialLinks: { ...emptyAuthor.socialLinks, ...(author.socialLinks || {}) },
    });
  };

  const startCreateAuthor = () => {
    resetMediaSession();
    authorSlugRequestRef.current?.abort();
    originalAuthorSlugRef.current = "";
    setEditingAuthorId(null);
    setAuthorForm(emptyAuthor);
    setAuthorSlugTouched(false);
    setAuthorSlugState({ status: "idle", message: "Use at least 2 characters" });
    setShowAuthorForm(true);
  };

  const deleteAuthor = async (authorId) => {
    if (!window.confirm("Delete this author? Posts must be moved or deleted first.")) return;
    try {
      await axios.delete(`/blogs/admin/authors/${authorId}`);
      toast.success("Author deleted");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete author");
    }
  };

  const updateComment = async (commentId, status) => {
    try {
      await axios.patch(`/blogs/admin/comments/${commentId}`, { status });
      toast.success("Comment updated");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update comment");
    }
  };

  const stepIsReady = (index) => {
    const checks = index === 2 ? currentSeoChecks() : seoChecks;
    if (index === 0) {
      const slugReady =
        slugState.status === "available" ||
        (editingPostId && !["checking", "taken", "error"].includes(slugState.status));

      return (
        postForm.title.trim().length >= 5 &&
        postForm.slug.trim().length >= 5 &&
        postForm.author &&
        postForm.excerpt.trim().length >= 40 &&
        postForm.coverImage.url &&
        postForm.coverImage.alt.trim().length >= 8 &&
        slugReady
      );
    }
    if (index === 1) {
      const html = editorRef.current ? cleanEditorHtml(editorRef.current.innerHTML) : postForm.contentHtml;
      return !!stripHtml(html);
    }
    if (index === 2) return checks.every(([, ok]) => ok);
    return true;
  };

  const canGoNext = step < steps.length - 1 && stepIsReady(step);
  const saveDisabled = saving || loading || slugState.status === "checking" || !!uploading;
  const publishDisabled = saveDisabled || currentSeoChecks().some(([, ok]) => !ok);
  const authorSaveDisabled =
    savingAuthor || loading || authorSlugState.status === "checking" || uploading === "author-avatar";

  const previewWidth =
    previewSize === "mobile" ? "390px" : previewSize === "tablet" ? "760px" : "100%";

  const goToNextStep = () => {
    if (step === 1) syncEditorContentIntoForm();
    setStep((value) => Math.min(steps.length - 1, value + 1));
  };

  const StepButton = ({ index }) => {
    const active = step === index;
    const ready = stepIsReady(index);
    return (
      <div
        aria-current={active ? "step" : undefined}
        aria-disabled="true"
        className={`step-status min-w-[160px] flex-1 cursor-default select-none rounded-lg border p-3 text-left transition ${
          active
            ? "border-blue-600 bg-blue-50 text-blue-900"
            : ready
              ? "border-gray-200 bg-white text-gray-600"
              : "border-gray-200 bg-gray-50 text-gray-400"
        }`}
        title="Use the Back and Next buttons to move through the editor"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">{steps[index].label}</span>
          {ready && <Check className="h-4 w-4 text-emerald-600" />}
        </span>
        <span className="mt-1 block text-xs">{steps[index].description}</span>
      </div>
    );
  };

  const renderSetupStep = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Title</span>
            <input
              value={postForm.title}
              onChange={(event) => updatePost("title", event.target.value)}
              placeholder="Example: New teacher tools for faster course setup"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Slug</span>
            <input
              value={postForm.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updatePost("slug", slugify(event.target.value));
              }}
              placeholder="new-teacher-tools"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p
              className={`text-xs ${
                slugState.status === "available"
                  ? "text-emerald-700"
                  : slugState.status === "taken" || slugState.status === "error"
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {slugState.message || `${BLOG_URL}/${postForm.slug || "slug"}`}
            </p>
            {slugState.status === "error" && (
              <button
                type="button"
                onClick={() => {
                  slugCheckCacheRef.current.delete(`post:${editingPostId || "new"}:${postForm.slug.trim()}`);
                  setSlugRetryKey((value) => value + 1);
                }}
                className="text-xs font-bold text-blue-700 underline underline-offset-4"
              >
                Retry slug check
              </button>
            )}
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Author</span>
            <select
              value={postForm.author}
              onChange={(event) => updatePost("author", event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select author</option>
              {authors.map((author) => (
                <option key={author._id} value={author._id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Excerpt</span>
            <textarea
              value={postForm.excerpt}
              onChange={(event) => updatePost("excerpt", event.target.value)}
              rows={4}
              maxLength={320}
              placeholder="Short, specific summary shown on cards, social previews, and search results."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-gray-500">{postForm.excerpt.length}/320 characters</p>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Category</span>
            <input
              value={postForm.category}
              onChange={(event) => updatePost("category", event.target.value)}
              placeholder="platform"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Tags</span>
            <input
              value={Array.isArray(postForm.tags) ? postForm.tags.join(", ") : postForm.tags}
              onChange={(event) => updatePost("tags", event.target.value)}
              placeholder="feature, teacher, courses"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="flex items-center gap-2 font-bold text-gray-950">
          <Image className="h-4 w-4" />
          Cover image
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          Upload is preferred. A direct Cloudinary/image URL is still allowed for existing assets.
        </p>
        <div className="mt-4 space-y-3">
          {postForm.coverImage.url ? (
            <img
              src={postForm.coverImage.url}
              alt={postForm.coverImage.alt || "Cover preview"}
              className="aspect-video w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
              No cover selected
            </div>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100">
            <UploadCloud className="h-4 w-4" />
            {uploading === "cover" ? "Uploading..." : "Upload cover"}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => uploadCover(event.target.files?.[0])}
            />
          </label>
          <input
            value={postForm.coverImage.url}
            onChange={(event) =>
              updatePost("coverImage", {
                ...postForm.coverImage,
                url: event.target.value,
                public_id: "",
                resource_type: "image",
              })
            }
            placeholder="Or paste image URL"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={postForm.coverImage.alt}
            onChange={(event) => updatePost("coverImage.alt", event.target.value)}
            placeholder="Describe the image for accessibility and SEO"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );

  const renderBodyStep = () => (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            [Bold, () => command("bold"), "Bold", editorState.bold],
            [Italic, () => command("italic"), "Italic", editorState.italic],
            [Underline, () => command("underline"), "Underline", editorState.underline],
            [List, () => toggleList("unordered"), "Bullet list"],
            [ListOrdered, () => toggleList("ordered"), "Numbered list"],
            [AlignLeft, () => command("justifyLeft"), "Align left"],
            [AlignCenter, () => command("justifyCenter"), "Align center"],
          ].map(([Icon, action, label, active]) => (
            <button
              key={label}
              type="button"
              onMouseDown={holdEditorSelection}
              onClick={action}
              title={label}
              className={activeToolClass(active)}
            >
              {React.createElement(Icon, { className: "h-4 w-4" })}
            </button>
          ))}
          {[
            ["p", "P", () => formatSelectedBlocks("p")],
            ["h1", "H1", () => formatSelectedBlocks("h1")],
            ["h2", "H2", () => formatSelectedBlocks("h2")],
            ["h3", "H3", () => formatSelectedBlocks("h3")],
            ["blockquote", "Quote", () => formatSelectedBlocks("blockquote")],
          ].map(([block, label, action]) => (
            <button
              key={block}
              type="button"
              onMouseDown={holdEditorSelection}
              onClick={action}
              className={blockButtonClass(block)}
              title={
                label === "Quote"
                  ? "Quote block. Press Enter once to exit it."
                  : label === "H1"
                    ? "Body H1. Usually avoid this because the blog title is already the page H1."
                    : label
              }
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={holdEditorSelection}
            onClick={() => command("removeFormat")}
            className="rounded border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-blue-300 hover:bg-blue-50"
          >
            Clear
          </button>
          <label className="inline-flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-700">
            <Type className="h-4 w-4" />
            <select
              value={TEXT_SIZE_OPTIONS.some((option) => option.value === editorState.fontSize) ? editorState.fontSize : ""}
              onMouseDown={saveEditorSelection}
              onChange={(event) => event.target.value && setTextSize(event.target.value)}
              className="bg-transparent outline-none"
              title="Text size applies to selected text"
            >
              <option value="">Size</option>
              {TEXT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}px
                </option>
              ))}
            </select>
          </label>
          <select
            onMouseDown={saveEditorSelection}
            onChange={(event) => setFontFamily(event.target.value)}
            className="rounded border border-gray-200 px-2 py-2 text-sm"
            defaultValue="Inter"
          >
            <option value="Inter">Inter</option>
            <option value="Georgia">Georgia</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times</option>
          </select>
          <label className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1.5 text-xs">
            <Palette className="h-4 w-4" />
            <input
              type="color"
              value={textColor}
              onMouseDown={saveEditorSelection}
              onChange={(event) => {
                setTextColor(event.target.value);
                command("foreColor", event.target.value);
              }}
            />
          </label>
          <label className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1.5 text-xs">
            Highlight
            <input
              type="color"
              value={highlightColor}
              onMouseDown={saveEditorSelection}
              onChange={(event) => {
                setHighlightColor(event.target.value);
                command("backColor", event.target.value);
              }}
            />
          </label>
          <div className="flex min-w-[240px] flex-1 items-center gap-2">
            <input
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-2 text-sm"
            />
            <button
              type="button"
              onMouseDown={holdEditorSelection}
              onClick={applyLink}
              className="rounded bg-gray-900 p-2 text-white"
              title="Add link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowShortcutModal(true)}
            className="rounded border border-gray-200 p-2 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            title="Keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1">Block: {editorState.block.toUpperCase()}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">Size: {editorState.fontSize}</span>
          {editorState.inQuote && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Inside quote</span>}
          {editorState.hasLineBreak && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Line break in this block</span>}
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditor}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={() => {
            saveEditorSelection();
            updateEditorState();
          }}
          onMouseUp={() => {
            saveEditorSelection();
            updateEditorState();
          }}
          onFocus={() => {
            saveEditorSelection();
            updateEditorState();
          }}
          className="blog-editor min-h-[680px] overflow-auto px-6 py-6 font-serif text-[18px] leading-8 outline-none"
        />
        <aside className="space-y-5 border-t border-gray-200 p-4 xl:border-l xl:border-t-0">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Image className="h-4 w-4" />
              Insert image
            </h3>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold hover:bg-gray-100">
                <UploadCloud className="h-4 w-4" />
                {imageDraft.file ? `${imageDraft.file.name} (${formatBytes(imageDraft.file.size)})` : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) =>
                    setImageDraft((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                  }
                />
              </label>
              <input
                value={imageDraft.url}
                onChange={(event) => setImageDraft((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="Or paste image URL"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                value={imageDraft.alt}
                onChange={(event) => setImageDraft((prev) => ({ ...prev, alt: event.target.value }))}
                placeholder="Alt text"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={imageDraft.align}
                onChange={(event) => setImageDraft((prev) => ({ ...prev, align: event.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="wide">Wide</option>
                <option value="left">Left wrap</option>
                <option value="right">Right wrap</option>
              </select>
              <button
                type="button"
                onClick={insertImage}
                disabled={uploading === "inline-image"}
                className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {uploading === "inline-image" ? "Uploading..." : "Insert image"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Video className="h-4 w-4" />
              Insert video
            </h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Upload MP4/WebM/MOV up to 10MB, or paste a trusted YouTube, Vimeo, or Dailymotion link.
            </p>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold hover:bg-gray-100">
                <UploadCloud className="h-4 w-4" />
                {videoDraft.file ? `${videoDraft.file.name} (${formatBytes(videoDraft.file.size)})` : "Upload video"}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(event) =>
                    setVideoDraft((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                  }
                />
              </label>
              <input
                value={videoDraft.url}
                onChange={(event) => setVideoDraft((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="Or paste video URL"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={insertVideo}
                disabled={uploading === "inline-video"}
                className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {uploading === "inline-video" ? "Uploading..." : "Insert video"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderSeoStep = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold">
          <Search className="h-4 w-4" />
          SEO and sharing
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Meta title</span>
            <input
              value={postForm.seo.metaTitle}
              onChange={(event) => updatePost("seo.metaTitle", event.target.value)}
              placeholder={postForm.title || "Search title"}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Canonical and share URL</span>
            <input
              value={automaticPostUrl}
              readOnly
              className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
            <p className="text-xs leading-5 text-gray-500">
              Selected automatically from the slug and saved with the post, so SEO canonical, Open Graph URL, and share buttons stay aligned.
            </p>
          </div>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Meta description</span>
            <textarea
              value={postForm.seo.metaDescription}
              onChange={(event) => updatePost("seo.metaDescription", event.target.value)}
              placeholder={postForm.excerpt || "Search result description"}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Keywords</span>
            <input
              value={Array.isArray(postForm.seo.keywords) ? postForm.seo.keywords.join(", ") : postForm.seo.keywords}
              onChange={(event) => updatePost("seo.keywords", event.target.value)}
              placeholder="feature, teacher portal"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Share title</span>
            <input
              value={postForm.social.shareTitle}
              onChange={(event) => updatePost("social.shareTitle", event.target.value)}
              placeholder={automaticShareTitle}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Share description</span>
            <textarea
              value={postForm.social.shareDescription}
              onChange={(event) => updatePost("social.shareDescription", event.target.value)}
              placeholder={automaticShareDescription}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900 lg:col-span-2">
            Sharing uses <strong>{automaticPostUrl}</strong>. Empty share title and description fields automatically fall back to the SEO title/description, then the blog title/excerpt.
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded border border-gray-200 p-2">
              <input
                type="checkbox"
                checked={postForm.seo.robots.index}
                onChange={(event) => updatePost("seo.robots.index", event.target.checked)}
              />
              Index this post
            </label>
            <label className="flex items-center gap-2 rounded border border-gray-200 p-2">
              <input
                type="checkbox"
                checked={postForm.seo.robots.follow}
                onChange={(event) => updatePost("seo.robots.follow", event.target.checked)}
              />
              Follow links
            </label>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="font-bold">Publish readiness</h3>
        <div className="mt-4 space-y-2">
          {seoChecks.map(([label, ok]) => (
            <div key={label} className="flex gap-2 text-sm leading-5">
              <span
                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                  ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className={ok ? "text-gray-800" : "text-gray-500"}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Eye className="h-4 w-4" />
            Full page preview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            This is the full article page, including the related blogs section that appears after the body.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            ["desktop", Monitor],
            ["tablet", Tablet],
            ["mobile", Smartphone],
          ].map(([size, Icon]) => (
            <button
              key={size}
              type="button"
              onClick={() => setPreviewSize(size)}
              className={`rounded border p-2 ${
                previewSize === size
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-300 text-gray-600"
              }`}
              title={`${size} preview`}
            >
              {React.createElement(Icon, { className: "h-4 w-4" })}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-auto rounded border border-gray-200 bg-gray-100 p-3">
        <iframe
          title="Blog preview"
          srcDoc={buildPreviewHtml(
            postForm,
            selectedAuthor,
            buildRelatedPreviewPosts(postForm, posts),
          )}
          style={{ width: previewWidth, height: 1100, margin: "0 auto", display: "block" }}
          className="rounded bg-white shadow-sm"
        />
      </div>
    </div>
  );

  return (
    <div className="blog-admin space-y-6 text-gray-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
            Blog workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
            Editorial, SEO, authors, comments
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Create server-rendered blog posts, product updates, guides, and platform stories for blogs.vidhgrow.online.
            Drafts stay private until you choose Publish.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["posts", FileText, "Blogs"],
            ["authors", UserRound, "Authors"],
            ["comments", MessageSquare, "Comments"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              disabled={saving || savingAuthor || !!uploading}
              onClick={() => {
                if (id === tab) return;
                if (tab === "posts") guardUnsaved(() => setTab(id));
                else setTab(id);
              }}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                tab === id
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {React.createElement(Icon, { className: "h-4 w-4" })}
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "posts" && (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold">Blogs</h2>
              </div>
              <div className="max-h-[720px] divide-y divide-gray-100 overflow-auto">
                {posts.map((post) => (
                  <div key={post._id} className="p-4">
                    <button type="button" onClick={() => editPost(post._id)} className="block w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold leading-5 text-gray-950">{post.title}</h3>
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            post.status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {post.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{post.excerpt}</p>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{post.author?.name || "No author"}</span>
                      <button
                        type="button"
                        disabled={loading || saving}
                        onClick={() => deletePost(post._id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!posts.length && <div className="p-6 text-sm text-gray-500">No blog posts yet.</div>}
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="grid gap-2 md:grid-cols-4">
              {steps.map((_, index) => (
                <StepButton key={steps[index].id} index={index} />
              ))}
            </div>

            {step === 0 && renderSetupStep()}
            {step === 1 && renderBodyStep()}
            {step === 2 && renderSeoStep()}
            {step === 3 && renderPreviewStep()}

            <div className="sticky bottom-0 z-10 -mx-2 border-t border-gray-200 bg-white/95 px-2 py-3 backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-xs text-gray-500">
                  {isDirty ? "Unsaved changes" : "All changes saved"} ·{" "}
                  {editingPostId ? "Editing existing post" : "New post"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep((value) => Math.max(0, value - 1))}
                    disabled={step === 0 || saving || loading}
                    className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!canGoNext || saving || loading}
                    className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => savePost("draft")}
                    disabled={saveDisabled}
                    className="inline-flex items-center gap-2 rounded bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {postForm.status === "published" ? "Move to draft" : "Save draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => savePost("published")}
                    disabled={publishDisabled}
                    className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" />
                    Publish
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "authors" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold">Authors</h2>
              <p className="mt-1 text-sm text-gray-500">
                Existing public authors are listed here. Open the form only when you need to create or edit one.
              </p>
            </div>
            <button
              type="button"
              onClick={startCreateAuthor}
              disabled={savingAuthor || loading || !!uploading || showAuthorForm}
              className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create author
            </button>
          </div>

          <div
            className={`grid gap-6 ${
              showAuthorForm || editingAuthorId ? "lg:grid-cols-[420px_minmax(0,1fr)]" : ""
            }`}
          >
            {(showAuthorForm || editingAuthorId) && (
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold">{editingAuthorId ? "Edit author" : "Create author"}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Avatar URL is optional. If no image is added, the public blog uses the first letter of the author name with a stable color.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 p-3">
              {renderAvatarPreview(authorForm, "h-14 w-14 text-xl")}
              <div className="min-w-0">
                <p className="truncate font-bold">{authorForm.name || "Author name"}</p>
                <p className="truncate text-xs text-gray-500">{authorForm.title || "Optional title"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Name</span>
                <input
                  value={authorForm.name}
                  onChange={(event) => updateAuthor("name", event.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Slug</span>
                <input
                  value={authorForm.slug}
                  onChange={(event) => {
                    setAuthorSlugTouched(true);
                    updateAuthor("slug", slugify(event.target.value));
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <p
                  className={`text-xs ${
                    authorSlugState.status === "available"
                      ? "text-emerald-700"
                      : authorSlugState.status === "taken" || authorSlugState.status === "error"
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {authorSlugState.message}
                </p>
                {authorSlugState.status === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      slugCheckCacheRef.current.delete(
                        `author:${editingAuthorId || "new"}:${authorForm.slug.trim()}`,
                      );
                      setAuthorSlugRetryKey((value) => value + 1);
                    }}
                    className="text-xs font-bold text-blue-700 underline underline-offset-4"
                  >
                    Retry slug check
                  </button>
                )}
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Title</span>
                <input
                  value={authorForm.title}
                  onChange={(event) => updateAuthor("title", event.target.value)}
                  placeholder="Example: Product team"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Avatar</span>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
                  <UploadCloud className="h-4 w-4" />
                  {uploading === "author-avatar" ? "Uploading..." : "Upload avatar"}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => uploadAuthorAvatar(event.target.files?.[0])}
                  />
                </label>
                <input
                  value={authorForm.avatar.url}
                  onChange={(event) => updateAuthor("avatar.url", event.target.value)}
                  placeholder="Or paste avatar URL"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  value={authorForm.avatar.alt}
                  onChange={(event) => updateAuthor("avatar.alt", event.target.value)}
                  placeholder="Avatar alt text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Bio</span>
                <textarea
                  value={authorForm.bio}
                  onChange={(event) => updateAuthor("bio", event.target.value)}
                  rows={4}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              {[
                ["socialLinks.website", "Website"],
                ["socialLinks.twitter", "Twitter/X"],
                ["socialLinks.linkedin", "LinkedIn"],
                ["socialLinks.instagram", "Instagram"],
              ].map(([path, label]) => (
                <label key={path} className="block space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
                  <input
                    value={path.split(".").reduce((obj, key) => obj?.[key], authorForm) || ""}
                    onChange={(event) => updateAuthor(path, event.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={saveAuthor}
                disabled={authorSaveDisabled}
                className="flex-1 rounded bg-gray-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAuthor ? "Saving..." : editingAuthorId ? "Save author" : "Create author"}
              </button>
              {(editingAuthorId || showAuthorForm) && (
                <button
                  type="button"
                  disabled={savingAuthor}
                  onClick={async () => {
                    await discardPendingMedia();
                    authorSlugRequestRef.current?.abort();
                    originalAuthorSlugRef.current = "";
                    setEditingAuthorId(null);
                    setAuthorForm(emptyAuthor);
                    setAuthorSlugTouched(false);
                    setAuthorSlugState({ status: "idle", message: "Use at least 2 characters" });
                    setShowAuthorForm(false);
                  }}
                  className="rounded border border-gray-300 px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
            )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <div key={author._id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {renderAvatarPreview(author)}
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{author.name}</h3>
                    <p className="truncate text-xs text-gray-500">/{author.slug}</p>
                  </div>
                </div>
                <p className="mt-1 text-sm font-semibold text-blue-700">{author.title || "No title"}</p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{author.bio || "No bio yet."}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editAuthor(author)}
                    disabled={savingAuthor || loading}
                    className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAuthor(author._id)}
                    disabled={savingAuthor || loading}
                    className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!authors.length && (
              <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-sm text-gray-500">
                No authors yet. Create the first author before publishing blogs.
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {tab === "comments" && (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-bold">Comments</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <div key={comment._id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm leading-6 text-gray-800">{comment.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {comment.user?.name || "User"} on {comment.post?.title || "Deleted post"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["visible", "hidden", "removed"].map((commentStatus) => (
                    <button
                      key={commentStatus}
                      type="button"
                      disabled={loading || comment.status === commentStatus}
                      onClick={() => updateComment(comment._id, commentStatus)}
                      className={`rounded border px-3 py-2 text-xs font-bold capitalize disabled:cursor-not-allowed disabled:opacity-60 ${
                        comment.status === commentStatus
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {commentStatus}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!comments.length && <div className="p-8 text-sm text-gray-500">No comments yet.</div>}
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950">You have unsaved changes</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  You can save this as a draft and edit it later, continue editing, or leave without saving.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                disabled={saving}
                className="rounded border border-gray-300 px-3 py-2 text-sm font-bold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue editing
              </button>
              <button
                type="button"
                disabled={saveDisabled}
                onClick={async () => {
                  await savePost("draft", { after: runPendingAction });
                }}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save draft"}
              </button>
              <button
                type="button"
                onClick={discardAndRunPendingAction}
                disabled={saving}
                className="rounded bg-gray-950 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {showShortcutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950">
                  <Keyboard className="h-5 w-5" />
                  Editor shortcuts
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  These shortcuts work inside the body editor and keep the saved blog HTML clean.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="rounded border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                title="Close shortcuts"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-2 text-sm">
              {[
                ["Ctrl/Cmd + B", "Bold selected text"],
                ["Ctrl/Cmd + I", "Italic selected text"],
                ["Ctrl/Cmd + U", "Underline selected text"],
                ["Ctrl/Cmd + ?", "Open this helper"],
                ["Tab", "Insert four spaces at the cursor, or indent selected blocks"],
                ["Shift + Tab", "Outdent selected blocks"],
                ["Shift + Enter", "Insert a visible line break"],
                ["Enter after heading", "Continue in a normal paragraph"],
                ["Enter inside quote", "Exit the quote block and continue in a normal paragraph"],
                ["List buttons", "Create a list at the cursor, or turn selected blocks into list items"],
                ["Select text + Size", "Apply text size only to the selection"],
              ].map(([keys, description]) => (
                <div key={keys} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 rounded border border-gray-100 p-3">
                  <kbd className="rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">{keys}</kbd>
                  <span className="text-gray-600">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .blog-admin button:not(:disabled) { cursor: pointer; }
        .blog-admin button:disabled { cursor: not-allowed; }
        .blog-admin input:disabled,
        .blog-admin textarea:disabled,
        .blog-admin select:disabled { cursor: not-allowed; background: #f9fafb; color: #9ca3af; }
        .blog-editor h1 { font-size: 2.25rem; line-height: 1.15; font-family: Inter, ui-sans-serif, system-ui; font-weight: 800; margin: 1.4rem 0 .7rem; }
        .blog-editor h2 { font-size: 1.65rem; line-height: 1.2; font-family: Inter, ui-sans-serif, system-ui; font-weight: 750; margin: 1.25rem 0 .6rem; }
        .blog-editor h3 { font-size: 1.25rem; line-height: 1.25; font-family: Inter, ui-sans-serif, system-ui; font-weight: 750; margin: 1.1rem 0 .5rem; }
        .blog-editor { caret-color: #2563eb; }
        .blog-editor:empty::before { content: "Start writing the blog body..."; color: #94a3b8; }
        .blog-editor br[data-editor-line-break="true"]::after { content: " line break"; color: #94a3b8; font-family: Inter, ui-sans-serif, system-ui; font-size: 11px; font-style: normal; }
        .blog-editor p { margin: .75rem 0; }
        .blog-editor ul,
        .blog-editor ol { margin: .9rem 0; padding-left: 1.5rem; }
        .blog-editor li { margin: .35rem 0; padding-left: .25rem; }
        .blog-editor blockquote { border-left: 4px solid #3b82f6; background: #eff6ff; padding: .7rem 1rem; margin: 1.2rem 0; font-style: italic; }
        .blog-editor a { color: #2563eb; text-decoration: underline; text-underline-offset: 4px; }
        .blog-editor img { max-width: 100%; border-radius: 6px; }
        .blog-editor figure { margin: 1.25rem 0; }
        .blog-editor figcaption { color: #64748b; font-size: .85rem; text-align: center; margin-top: .5rem; }
        .blog-editor iframe, .blog-editor video { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 6px; background: #111827; }
      `}</style>
    </div>
  );
};

export default BlogManagement;
