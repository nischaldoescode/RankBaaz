/**
 * presents the public media lab where learning assets show their cloudinary delivery path
 *
 * @file frontend/src/pages/mediadashboard.jsx
 * @module frontend/src/pages/mediadashboard
 * @returns {JSX.Element} responsive media lab page
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Cloud,
  ExternalLink,
  Images,
  Search,
  Newspaper,
  ScanSearch,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { apiMethods } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useSEO } from "../hooks/useSEO";
import "../styles/mediaDashboard.css";

const filters = [
  { value: "all", label: "Everything" },
  { value: "course", label: "Courses" },
  { value: "blog", label: "Blog notes" },
];

const pipelineStages = [
  {
    number: "01",
    icon: Cloud,
    title: "Keep the source connected",
    text: "A course cover or blog image stays linked to the record that gives it meaning",
  },
  {
    number: "02",
    icon: SlidersHorizontal,
    title: "Shape it at delivery",
    text: "Cloudinary applies automatic format, quality, and subject aware cropping for the surface",
  },
  {
    number: "03",
    icon: ScanSearch,
    title: "Make it useful",
    text: "The result reaches a learner as a searchable course, note, or next step rather than loose media",
  },
];

const sanitizeQuery = (value) =>
  String(value || "")
    .replace(/[<>`"'{}]/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const getDateLabel = (value) => {
  if (!value) return "recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recent";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const MediaSkeleton = () => (
  <div className="media-board-card media-board-skeleton" aria-hidden="true">
    <div className="media-board-skeleton-image" />
    <div className="media-board-skeleton-line media-board-skeleton-line-wide" />
    <div className="media-board-skeleton-line" />
    <div className="media-board-skeleton-line media-board-skeleton-line-short" />
  </div>
);

const MediaCard = ({ item }) => {
  const isBlog = item.type === "blog";
  const [imageFailed, setImageFailed] = useState(false);
  const icon = isBlog ? <Newspaper size={15} /> : <BookOpen size={15} />;
  const delivery = item.delivery || {};
  const content = (
    <>
      <div className="media-board-image-wrap">
        {imageFailed ? (
          <div className="media-board-image-fallback" aria-label="media preview unavailable">
            <Images size={30} />
            <span>preview unavailable</span>
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.alt || `${item.title} preview`}
            className="media-board-image"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        )}
        <span className="media-board-type">
          {icon}
          {isBlog ? "Blog note" : "Course"}
        </span>
      </div>
      <div className="media-board-card-body">
        <p className="media-board-topic">{item.topic}</p>
        <h2>{item.title}</h2>
        <p className="media-board-summary">{item.summary}</p>
        <div className="media-board-delivery">
          <span className="media-board-delivery-dot" aria-hidden="true" />
          {delivery.provider || "Cloudinary delivery"}
          {delivery.responsive ? " · responsive crop" : ""}
        </div>
        <div className="media-board-transformations" aria-label="delivery transformations">
          {(delivery.transformations || []).slice(0, 3).map((transformation) => (
            <span key={transformation}>{transformation}</span>
          ))}
        </div>
        <div className="media-board-card-footer">
          <span>{getDateLabel(item.updatedAt)}</span>
          {isBlog ? <ExternalLink size={16} /> : <ArrowUpRight size={16} />}
        </div>
      </div>
    </>
  );

  if (isBlog) {
    return (
      <a
        className="media-board-card"
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link className="media-board-card" to={item.href}>
      {content}
    </Link>
  );
};

const MediaPipeline = ({ reducedMotion }) => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <motion.section
      ref={sectionRef}
      className="media-board-pipeline"
      aria-labelledby="media-pipeline-title"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={reducedMotion || isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="media-board-pipeline-heading">
      <div className="media-board-kicker">
        <Sparkles size={16} aria-hidden="true" />
        <span>the pipeline</span>
      </div>
      <h2 id="media-pipeline-title">One asset, a better route to the lesson</h2>
      <p>
        Vidhgrow uses Cloudinary as part of the product workflow. The image is
        connected to its source, shaped for the screen, and delivered beside
        something worth opening
      </p>
      </div>
      <div className="media-board-pipeline-rail" aria-label="Cloudinary media pipeline">
        {pipelineStages.map(({ number, icon: Icon, title, text }, index) => (
          <motion.article
            className="media-board-pipeline-stage"
            key={number}
            initial={reducedMotion ? false : { opacity: 0, x: 18 }}
            animate={reducedMotion || isInView ? { opacity: 1, x: 0 } : undefined}
            transition={{ delay: reducedMotion ? 0 : index * 0.12, duration: 0.55 }}
          >
          <div className="media-board-pipeline-marker">
            <span>{number}</span>
            <Icon size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="media-board-pipeline-label">stage {index + 1}</p>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
};

const DeliveryNotes = ({ reducedMotion }) => {
  const notes = [
    {
      code: "f_auto",
      title: "the format follows the screen",
      text: "Cloudinary negotiates a browser-friendly image format so the same approved source can travel across devices",
    },
    {
      code: "q_auto",
      title: "quality stays intentional",
      text: "Automatic quality keeps the visual result useful without sending a needlessly heavy file to the learner",
    },
    {
      code: "g_auto",
      title: "the subject stays in frame",
      text: "Automatic gravity helps a course or story cover keep its important subject when the layout changes shape",
    },
  ];

  return (
    <section className="media-board-delivery-notes" aria-labelledby="media-delivery-title">
      <div className="media-board-delivery-notes-intro">
        <p className="media-board-kicker">what changes at delivery</p>
        <h2 id="media-delivery-title">One source, three quiet decisions</h2>
        <p>
          The public page does not need to know where the asset lives. It only
          needs the right image for the next action
        </p>
      </div>
      <div className="media-board-delivery-note-grid">
        {notes.map((note, index) => (
          <motion.article
            className="media-board-delivery-note"
            key={note.code}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: reducedMotion ? 0 : index * 0.08, duration: 0.5 }}
          >
            <span className="media-board-delivery-code">{note.code}</span>
            <h3>{note.title}</h3>
            <p>{note.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

const MediaDashboard = () => {
  const { reducedMotion } = useTheme();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ courses: 0, blogs: 0, total: 0, cloudinaryManaged: 0 });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useSEO({
    title: "Cloudinary Media Lab for Courses and Blog Notes",
    description:
      "Explore how Vidhgrow connects course and blog media to Cloudinary delivery, responsive transformations, and useful learning paths",
    keywords:
      "Vidhgrow media lab, Cloudinary learning platform, course media, optimized images",
    canonicalUrl: `${window.location.origin}/media`,
    type: "website",
    noindex: false,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Vidhgrow Cloudinary Media Lab",
      description:
        "A public collection of approved Vidhgrow learning media and its delivery workflow",
      url: `${window.location.origin}/media`,
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadBoard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiMethods.get("/api/media-dashboard?limit=24", {
          signal: controller.signal,
        });
        if (!active) return;
        const data = response.data?.data || {};
        setItems(Array.isArray(data.items) ? data.items : []);
        setCounts(data.counts || { courses: 0, blogs: 0, total: 0, cloudinaryManaged: 0 });
      } catch (requestError) {
        if (active && requestError?.code !== "ERR_CANCELED") {
          setError("The media lab could not load right now");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBoard();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const visibleItems = useMemo(() => {
    const safeQuery = sanitizeQuery(query).toLowerCase();
    return items.filter((item) => {
      const typeMatches = filter === "all" || item.type === filter;
      const text = `${item.title} ${item.summary} ${item.topic}`.toLowerCase();
      return typeMatches && (!safeQuery || text.includes(safeQuery));
    });
  }, [filter, items, query]);

  return (
    <section className={`media-board-shell ${reducedMotion ? "media-board-reduced" : ""}`}>
      <div className="media-board-scenery" aria-hidden="true">
        <span className="media-board-scenery-line media-board-scenery-line-a" />
        <span className="media-board-scenery-line media-board-scenery-line-b" />
        <span className="media-board-scenery-ring media-board-scenery-ring-a" />
        <span className="media-board-scenery-ring media-board-scenery-ring-b" />
      </div>
      <div className="media-board-inner">
        <header className="media-board-header">
          <div className="media-board-kicker">
            <Images size={16} aria-hidden="true" />
            <span>Vidhgrow media lab</span>
          </div>
          <h1>Media that helps the next lesson land</h1>
          <p>
            A working view of the course covers and platform notes that move
            through Vidhgrow, from a source record to a responsive Cloudinary
            delivery
          </p>
          <div className="media-board-header-actions">
            <a className="media-board-text-link" href="#media-library">
              Browse the library <ArrowRight size={16} />
            </a>
            <span className="media-board-header-note">
              {counts.cloudinaryManaged
                ? `${counts.cloudinaryManaged} Cloudinary-managed assets in this view`
                : "source-linked delivery is shown here"}
            </span>
          </div>
        </header>

        <MediaPipeline reducedMotion={reducedMotion} />
        <DeliveryNotes reducedMotion={reducedMotion} />

        <section id="media-library" className="media-board-library" aria-labelledby="media-library-title">
          <div className="media-board-library-heading">
            <div>
              <p className="media-board-kicker">the library</p>
              <h2 id="media-library-title">Open something useful</h2>
            </div>
            <div className="media-board-counts" aria-label="media counts">
              <span><strong>{counts.total}</strong> shown</span>
              <span><strong>{counts.courses}</strong> courses</span>
              <span><strong>{counts.blogs}</strong> notes</span>
            </div>
          </div>

          <div className="media-board-controls" aria-label="Media library controls">
            <label className="media-board-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search the media library</span>
              <input
                type="search"
                value={query}
                maxLength={80}
                onChange={(event) => setQuery(sanitizeQuery(event.target.value))}
                placeholder="Search courses or notes"
              />
            </label>
            <div className="media-board-filters" role="tablist" aria-label="Media type">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  className={filter === item.value ? "is-selected" : ""}
                  onClick={() => setFilter(item.value)}
                >
                  {filter === item.value && <Check size={14} aria-hidden="true" />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="media-board-state" role="alert">
              <strong>{error}</strong>
              <button type="button" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="media-board-grid" aria-label="Loading media library">
              {Array.from({ length: 6 }, (_, index) => <MediaSkeleton key={index} />)}
            </div>
          ) : visibleItems.length ? (
            <div className="media-board-grid">
              {visibleItems.map((item) => <MediaCard key={`${item.type}-${item.id}`} item={item} />)}
            </div>
          ) : (
            <div className="media-board-state">
              <strong>No matching media yet</strong>
              <span>Try a broader search or switch the media type</span>
            </div>
          )}
        </section>

        <footer className="media-board-footer">
          <div>
            <p className="media-board-kicker">keep moving</p>
            <h2>The useful asset is the one that gets you to the work</h2>
          </div>
          <Link className="media-board-footer-link" to="/courses">
            Explore courses <ArrowUpRight size={17} />
          </Link>
        </footer>
      </div>
    </section>
  );
};

export default MediaDashboard;
