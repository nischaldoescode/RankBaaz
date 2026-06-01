import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AlignLeft,
  Archive,
  Bold,
  BookOpenText,
  Calendar,
  Check,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Image,
  Italic,
  Link as LinkIcon,
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
  Underline,
  UserRound,
  Video,
} from "lucide-react";

const BLOG_URL = "https://blogs.vidhgrow.online";

const emptyAuthor = {
  name: "",
  slug: "",
  title: "",
  bio: "",
  avatar: { url: "", alt: "" },
  socialLinks: { website: "", twitter: "", linkedin: "", instagram: "" },
  isActive: true,
};

const emptyPost = {
  title: "",
  slug: "",
  excerpt: "",
  status: "draft",
  author: "",
  coverImage: { url: "", alt: "", placement: "hero" },
  contentHtml:
    "<h1>Start with a clear promise</h1><p>Write the opening like a helpful note to one real learner. Keep the rhythm calm, specific, and useful.</p>",
  tags: [],
  category: "learning",
  scheduledFor: "",
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

const splitList = (value) =>
  Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const buildPreviewHtml = (post, author) => {
  const title = post.title || "Untitled draft";
  const excerpt = post.excerpt || "Write a useful summary for search results.";
  const cover = post.coverImage?.url || "";
  const authorName = author?.name || "Vidhgrow Editorial";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#f8fafc;color:#172033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
    .shell{max-width:1120px;margin:0 auto;padding:28px 22px 72px;}
    header{border-bottom:1px solid #e5e7eb;padding:0 0 18px;margin-bottom:34px;display:flex;justify-content:space-between;gap:18px;align-items:center}
    .brand{font-weight:800;letter-spacing:.02em;color:#111827}
    .meta{font-size:13px;color:#64748b}
    article{max-width:760px;margin:0 auto;}
    h1{font-size:clamp(34px,6vw,64px);line-height:1.02;margin:0 0 18px;letter-spacing:0;font-weight:820;color:#111827;}
    .excerpt{font-size:19px;line-height:1.7;color:#475569;margin:0 0 26px;}
    .byline{display:flex;gap:12px;align-items:center;margin:24px 0 34px;color:#475569;font-size:14px;}
    .avatar{width:42px;height:42px;border-radius:999px;background:#e2e8f0;object-fit:cover}
    .cover{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px;margin:0 0 36px;background:#e5e7eb;}
    .content{font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:1.85;color:#1f2937;}
    .content h1,.content h2,.content h3{font-family:Inter,ui-sans-serif,system-ui,sans-serif;line-height:1.14;color:#111827;margin:38px 0 14px;letter-spacing:0}
    .content h1{font-size:38px}.content h2{font-size:30px}.content h3{font-size:24px}
    .content a{color:#0f766e;text-decoration-thickness:2px;text-underline-offset:4px}
    .content blockquote{border-left:4px solid #0f766e;margin:34px 0;padding:8px 0 8px 22px;color:#334155;font-style:italic;background:#f0fdfa}
    .content img{max-width:100%;border-radius:6px;display:block;margin:30px auto}
    .content figure{margin:34px 0}.content figcaption{font-size:14px;color:#64748b;text-align:center;margin-top:10px}
    .content iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:6px;margin:30px 0;background:#111827}
    @media(max-width:640px){.shell{padding:20px 16px 56px}.content{font-size:18px}header{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <div class="shell">
    <header><div class="brand">Vidhgrow Blog</div><div class="meta">${post.category || "learning"}</div></header>
    <article>
      <h1>${title}</h1>
      <p class="excerpt">${excerpt}</p>
      <div class="byline">
        ${
          author?.avatar?.url
            ? `<img class="avatar" src="${author.avatar.url}" alt="${author.avatar.alt || authorName}" />`
            : `<div class="avatar"></div>`
        }
        <div><strong>${authorName}</strong><br/><span>${Math.max(1, Math.ceil(countWords(post.contentHtml) / 220))} min read</span></div>
      </div>
      ${cover ? `<img class="cover" src="${cover}" alt="${post.coverImage?.alt || title}" />` : ""}
      <div class="content">${post.contentHtml || ""}</div>
    </article>
  </div>
</body>
</html>`;
};

const BlogManagement = () => {
  const editorRef = useRef(null);
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postForm, setPostForm] = useState(emptyPost);
  const [editingPostId, setEditingPostId] = useState(null);
  const [authorForm, setAuthorForm] = useState(emptyAuthor);
  const [editingAuthorId, setEditingAuthorId] = useState(null);
  const [previewSize, setPreviewSize] = useState("desktop");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDraft, setImageDraft] = useState({ url: "", alt: "", align: "wide" });
  const [videoUrl, setVideoUrl] = useState("");
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#fef3c7");

  const selectedAuthor = authors.find((author) => author._id === postForm.author);

  const seoChecks = useMemo(() => {
    const wordCount = countWords(postForm.contentHtml);
    const hasH1 = /<h1[\s>]/i.test(postForm.contentHtml);
    const metaTitle = postForm.seo.metaTitle || postForm.title;
    const metaDescription = postForm.seo.metaDescription || postForm.excerpt;
    return [
      {
        label: "One clear H1 in the article body",
        ok: hasH1,
      },
      {
        label: "Meta title between 35 and 70 characters",
        ok: metaTitle.length >= 35 && metaTitle.length <= 70,
      },
      {
        label: "Meta description between 70 and 170 characters",
        ok: metaDescription.length >= 70 && metaDescription.length <= 170,
      },
      {
        label: "Readable article length, at least 300 words",
        ok: wordCount >= 300,
      },
      {
        label: "Mandatory cover image and useful alt text",
        ok: !!postForm.coverImage.url && postForm.coverImage.alt.length >= 8,
      },
      {
        label: "SEO slug is clean and descriptive",
        ok: postForm.slug.length >= 5 && !postForm.slug.includes("--"),
      },
      {
        label: "Author selected",
        ok: !!postForm.author,
      },
    ];
  }, [postForm]);

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
    if (!editingPostId && postForm.title && !postForm.slug) {
      setPostForm((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [postForm.title, editingPostId]);

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

  const syncEditor = () => {
    if (editorRef.current) {
      updatePost("contentHtml", editorRef.current.innerHTML);
    }
  };

  const command = (name, value = null) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    syncEditor();
  };

  const applyLink = () => {
    if (!linkUrl.trim()) return;
    const href = linkUrl.trim();
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

  const insertImage = () => {
    if (!imageDraft.url.trim() || !imageDraft.alt.trim()) {
      toast.error("Image URL and alt text are required");
      return;
    }
    const alignClass = imageDraft.align === "left" ? "float:left;max-width:46%;margin:8px 24px 16px 0;" : imageDraft.align === "right" ? "float:right;max-width:46%;margin:8px 0 16px 24px;" : "display:block;width:100%;margin:28px auto;";
    command(
      "insertHTML",
      `<figure data-align="${imageDraft.align}"><img src="${imageDraft.url.trim()}" alt="${imageDraft.alt.trim()}" loading="lazy" style="${alignClass}" /><figcaption>${imageDraft.alt.trim()}</figcaption></figure><p></p>`,
    );
    setImageDraft({ url: "", alt: "", align: "wide" });
  };

  const insertVideo = () => {
    if (!/^https:\/\//i.test(videoUrl.trim())) {
      toast.error("Use an HTTPS YouTube, Vimeo, or Dailymotion URL");
      return;
    }
    command(
      "insertHTML",
      `<iframe src="${videoUrl.trim()}" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe><p></p>`,
    );
    setVideoUrl("");
  };

  const startNewPost = () => {
    setEditingPostId(null);
    setPostForm({
      ...emptyPost,
      author: authors[0]?._id || "",
      seo: {
        ...emptyPost.seo,
        canonicalUrl: "",
      },
    });
    setTab("posts");
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = emptyPost.contentHtml;
    }, 0);
  };

  const editPost = async (postId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/blogs/admin/posts/${postId}`);
      const post = res.data.data.post;
      setEditingPostId(postId);
      setPostForm({
        ...emptyPost,
        ...post,
        author: post.author?._id || post.author || "",
        tags: post.tags || [],
        seo: {
          ...emptyPost.seo,
          ...(post.seo || {}),
          robots: {
            ...emptyPost.seo.robots,
            ...(post.seo?.robots || {}),
          },
        },
        social: { ...emptyPost.social, ...(post.social || {}) },
      });
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = post.contentHtml || "";
      }, 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open post");
    } finally {
      setLoading(false);
    }
  };

  const savePost = async () => {
    try {
      syncEditor();
      const payload = {
        ...postForm,
        tags: splitList(postForm.tags),
        seo: {
          ...postForm.seo,
          keywords: splitList(postForm.seo.keywords),
        },
      };
      const request = editingPostId
        ? axios.put(`/blogs/admin/posts/${editingPostId}`, payload)
        : axios.post("/blogs/admin/posts", payload);
      await request;
      toast.success(editingPostId ? "Blog updated" : "Blog created");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save blog");
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this blog post and its comments?")) return;
    try {
      await axios.delete(`/blogs/admin/posts/${postId}`);
      toast.success("Blog deleted");
      if (editingPostId === postId) startNewPost();
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete blog");
    }
  };

  const saveAuthor = async () => {
    try {
      const payload = {
        ...authorForm,
        slug: slugify(authorForm.slug || authorForm.name),
      };
      const request = editingAuthorId
        ? axios.put(`/blogs/admin/authors/${editingAuthorId}`, payload)
        : axios.post("/blogs/admin/authors", payload);
      await request;
      toast.success(editingAuthorId ? "Author updated" : "Author created");
      setAuthorForm(emptyAuthor);
      setEditingAuthorId(null);
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save author");
    }
  };

  const editAuthor = (author) => {
    setEditingAuthorId(author._id);
    setAuthorForm({
      ...emptyAuthor,
      ...author,
      avatar: { ...emptyAuthor.avatar, ...(author.avatar || {}) },
      socialLinks: { ...emptyAuthor.socialLinks, ...(author.socialLinks || {}) },
    });
  };

  const deleteAuthor = async (authorId) => {
    if (!window.confirm("Delete this author? Posts must be moved first.")) return;
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

  const previewWidth =
    previewSize === "mobile" ? "390px" : previewSize === "tablet" ? "760px" : "100%";

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Blog workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">
            Editorial, SEO, authors, comments
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Create server-rendered, search-friendly posts for blogs.vidhgrow.online.
            Content is saved encrypted in the backend while public pages remain readable for crawlers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["posts", FileText, "Posts"],
            ["authors", UserRound, "Authors"],
            ["comments", MessageSquare, "Comments"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                tab === id
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "posts" && (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <button
              onClick={startNewPost}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-800"
            >
              <Plus className="h-4 w-4" />
              New blog post
            </button>

            <div className="rounded-md border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold">Posts</h2>
              </div>
              <div className="max-h-[720px] divide-y divide-gray-100 overflow-auto">
                {posts.map((post) => (
                  <div key={post._id} className="p-4">
                    <button
                      onClick={() => editPost(post._id)}
                      className="block w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold leading-5 text-gray-950">
                          {post.title}
                        </h3>
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            post.status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : post.status === "scheduled"
                                ? "bg-blue-50 text-blue-700"
                                : post.status === "archived"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                        {post.excerpt}
                      </p>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{post.author?.name || "No author"}</span>
                      <button
                        onClick={() => deletePost(post._id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!posts.length && (
                  <div className="p-6 text-sm text-gray-500">
                    No blog posts yet.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Title
                  </span>
                  <input
                    value={postForm.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setPostForm((prev) => ({
                        ...prev,
                        title,
                        slug: editingPostId ? prev.slug : slugify(title),
                      }));
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Slug
                  </span>
                  <input
                    value={postForm.slug}
                    onChange={(event) => updatePost("slug", slugify(event.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1 lg:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Excerpt
                  </span>
                  <textarea
                    value={postForm.excerpt}
                    onChange={(event) => updatePost("excerpt", event.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Author
                  </span>
                  <select
                    value={postForm.author}
                    onChange={(event) => updatePost("author", event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  >
                    <option value="">Select author</option>
                    {authors.map((author) => (
                      <option key={author._id} value={author._id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Status
                  </span>
                  <select
                    value={postForm.status}
                    onChange={(event) => updatePost("status", event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Cover image URL
                  </span>
                  <input
                    value={postForm.coverImage.url}
                    onChange={(event) => updatePost("coverImage.url", event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Cover alt text
                  </span>
                  <input
                    value={postForm.coverImage.alt}
                    onChange={(event) => updatePost("coverImage.alt", event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Tags
                  </span>
                  <input
                    value={Array.isArray(postForm.tags) ? postForm.tags.join(", ") : postForm.tags}
                    onChange={(event) => updatePost("tags", event.target.value)}
                    placeholder="exam prep, study plan"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Scheduled date
                  </span>
                  <input
                    type="datetime-local"
                    value={postForm.scheduledFor ? postForm.scheduledFor.slice(0, 16) : ""}
                    onChange={(event) => updatePost("scheduledFor", event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3">
                {[
                  [Bold, () => command("bold"), "Bold"],
                  [Italic, () => command("italic"), "Italic"],
                  [Underline, () => command("underline"), "Underline"],
                  [Heading1, () => command("formatBlock", "H1"), "H1"],
                  [Heading2, () => command("formatBlock", "H2"), "H2"],
                  [AlignLeft, () => command("formatBlock", "P"), "Paragraph"],
                  [Quote, () => command("formatBlock", "BLOCKQUOTE"), "Quote"],
                ].map(([Icon, onClick, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="rounded border border-gray-200 p-2 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
                <select
                  onChange={(event) => command("fontName", event.target.value)}
                  className="rounded border border-gray-200 px-2 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Font
                  </option>
                  <option value="Georgia">Georgia</option>
                  <option value="Arial">Arial</option>
                  <option value="Inter">Inter</option>
                  <option value="Times New Roman">Times</option>
                </select>
                <label className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1.5 text-xs">
                  <Palette className="h-4 w-4" />
                  <input
                    type="color"
                    value={textColor}
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
                    onChange={(event) => {
                      setHighlightColor(event.target.value);
                      command("backColor", event.target.value);
                    }}
                  />
                </label>
                <div className="flex min-w-[260px] flex-1 items-center gap-2">
                  <input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://example.com"
                    className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyLink}
                    className="rounded bg-gray-900 p-2 text-white"
                    title="Add link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncEditor}
                  className="blog-editor min-h-[620px] overflow-auto px-6 py-6 font-serif text-[18px] leading-8 outline-none"
                  dangerouslySetInnerHTML={{ __html: postForm.contentHtml }}
                />
                <aside className="space-y-4 border-t border-gray-200 p-4 lg:border-l lg:border-t-0">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Image className="h-4 w-4" />
                      Insert image
                    </h3>
                    <div className="mt-3 space-y-2">
                      <input
                        value={imageDraft.url}
                        onChange={(event) =>
                          setImageDraft((prev) => ({ ...prev, url: event.target.value }))
                        }
                        placeholder="Image URL"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={imageDraft.alt}
                        onChange={(event) =>
                          setImageDraft((prev) => ({ ...prev, alt: event.target.value }))
                        }
                        placeholder="Alt text"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={imageDraft.align}
                        onChange={(event) =>
                          setImageDraft((prev) => ({ ...prev, align: event.target.value }))
                        }
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="wide">Wide</option>
                        <option value="left">Left wrap</option>
                        <option value="right">Right wrap</option>
                      </select>
                      <button
                        type="button"
                        onClick={insertImage}
                        className="w-full rounded bg-teal-700 px-3 py-2 text-sm font-bold text-white"
                      >
                        Insert image
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Video className="h-4 w-4" />
                      Insert video
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Use trusted HTTPS embeds. YouTube, Vimeo, and Dailymotion are allowed.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={videoUrl}
                        onChange={(event) => setVideoUrl(event.target.value)}
                        placeholder="https://www.youtube.com/embed/..."
                        className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={insertVideo}
                        className="rounded bg-gray-900 px-3 py-2 text-white"
                      >
                        <Video className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-md border border-gray-200 p-3">
                    <h3 className="flex items-center gap-2 text-sm font-bold">
                      <Search className="h-4 w-4" />
                      SEO checks
                    </h3>
                    <div className="mt-3 space-y-2">
                      {seoChecks.map((check) => (
                        <div key={check.label} className="flex gap-2 text-xs leading-5">
                          <span
                            className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full ${
                              check.ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className={check.ok ? "text-gray-700" : "text-gray-500"}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="flex items-center gap-2 font-bold">
                  <Search className="h-4 w-4" />
                  SEO
                </h2>
                <div className="mt-4 space-y-3">
                  <input
                    value={postForm.seo.metaTitle}
                    onChange={(event) => updatePost("seo.metaTitle", event.target.value)}
                    placeholder="Meta title"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={postForm.seo.metaDescription}
                    onChange={(event) => updatePost("seo.metaDescription", event.target.value)}
                    placeholder="Meta description"
                    rows={3}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={Array.isArray(postForm.seo.keywords) ? postForm.seo.keywords.join(", ") : postForm.seo.keywords}
                    onChange={(event) => updatePost("seo.keywords", event.target.value)}
                    placeholder="Keywords"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={postForm.seo.canonicalUrl}
                    onChange={(event) => updatePost("seo.canonicalUrl", event.target.value)}
                    placeholder={`${BLOG_URL}/${postForm.slug || "slug"}`}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center gap-2 rounded border border-gray-200 p-2">
                      <input
                        type="checkbox"
                        checked={postForm.seo.robots.index}
                        onChange={(event) => updatePost("seo.robots.index", event.target.checked)}
                      />
                      Index
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
                <button
                  onClick={savePost}
                  disabled={loading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {editingPostId ? "Save changes" : "Create blog"}
                </button>
              </div>

              <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-bold">
                    <Eye className="h-4 w-4" />
                    Full page preview
                  </h2>
                  <div className="flex gap-2">
                    {[
                      ["desktop", Monitor],
                      ["tablet", Tablet],
                      ["mobile", Smartphone],
                    ].map(([size, Icon]) => (
                      <button
                        key={size}
                        onClick={() => setPreviewSize(size)}
                        className={`rounded border p-2 ${
                          previewSize === size
                            ? "border-gray-950 bg-gray-950 text-white"
                            : "border-gray-300 text-gray-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 overflow-auto rounded border border-gray-200 bg-gray-100 p-3">
                  <iframe
                    title="Blog preview"
                    srcDoc={buildPreviewHtml(postForm, selectedAuthor)}
                    style={{ width: previewWidth, height: 720, margin: "0 auto", display: "block" }}
                    className="rounded bg-white shadow-sm"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "authors" && (
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold">{editingAuthorId ? "Edit author" : "Create author"}</h2>
            <div className="mt-4 space-y-3">
              {[
                ["name", "Name"],
                ["slug", "Slug"],
                ["title", "Title"],
                ["avatar.url", "Avatar URL"],
                ["avatar.alt", "Avatar alt text"],
                ["socialLinks.website", "Website"],
                ["socialLinks.twitter", "Twitter/X"],
                ["socialLinks.linkedin", "LinkedIn"],
                ["socialLinks.instagram", "Instagram"],
              ].map(([path, label]) => {
                const parts = path.split(".");
                const value = parts.length === 1 ? authorForm[path] : authorForm[parts[0]][parts[1]];
                return (
                  <label key={path} className="block space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {label}
                    </span>
                    <input
                      value={value || ""}
                      onChange={(event) => {
                        const next = structuredClone(authorForm);
                        if (parts.length === 1) {
                          next[path] = path === "slug" ? slugify(event.target.value) : event.target.value;
                        } else {
                          next[parts[0]][parts[1]] = event.target.value;
                        }
                        if (path === "name" && !editingAuthorId) {
                          next.slug = slugify(event.target.value);
                        }
                        setAuthorForm(next);
                      }}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                );
              })}
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Bio
                </span>
                <textarea
                  value={authorForm.bio}
                  onChange={(event) => setAuthorForm((prev) => ({ ...prev, bio: event.target.value }))}
                  rows={4}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={saveAuthor}
                className="flex-1 rounded bg-gray-950 px-4 py-3 text-sm font-bold text-white"
              >
                {editingAuthorId ? "Save author" : "Create author"}
              </button>
              {editingAuthorId && (
                <button
                  onClick={() => {
                    setEditingAuthorId(null);
                    setAuthorForm(emptyAuthor);
                  }}
                  className="rounded border border-gray-300 px-4 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {authors.map((author) => (
              <div key={author._id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {author.avatar?.url ? (
                    <img
                      src={author.avatar.url}
                      alt={author.avatar.alt || author.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <UserRound className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{author.name}</h3>
                    <p className="truncate text-xs text-gray-500">/{author.slug}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                  {author.bio || "No bio yet."}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => editAuthor(author)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteAuthor(author._id)}
                    className="rounded border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
                  {["visible", "hidden", "removed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateComment(comment._id, status)}
                      className={`rounded border px-3 py-2 text-xs font-bold capitalize ${
                        comment.status === status
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!comments.length && (
              <div className="p-8 text-sm text-gray-500">No comments yet.</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .blog-editor h1 { font-size: 2.25rem; line-height: 1.15; font-family: Inter, ui-sans-serif, system-ui; font-weight: 800; margin: 1.4rem 0 .7rem; }
        .blog-editor h2 { font-size: 1.65rem; line-height: 1.2; font-family: Inter, ui-sans-serif, system-ui; font-weight: 750; margin: 1.25rem 0 .6rem; }
        .blog-editor p { margin: .75rem 0; }
        .blog-editor blockquote { border-left: 4px solid #0f766e; background: #f0fdfa; padding: .7rem 1rem; margin: 1.2rem 0; font-style: italic; }
        .blog-editor a { color: #0f766e; text-decoration: underline; text-underline-offset: 4px; }
        .blog-editor img { max-width: 100%; border-radius: 6px; }
        .blog-editor figure { margin: 1.25rem 0; }
        .blog-editor figcaption { color: #64748b; font-size: .85rem; text-align: center; margin-top: .5rem; }
        .blog-editor iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 6px; background: #111827; }
      `}</style>
    </div>
  );
};

export default BlogManagement;
