/**
 * presents a public visual board that helps learners browse course and blog media
 *
 * @file frontend/src/pages/mediadashboard.jsx
 * @module frontend/src/pages/mediadashboard
 * @returns {JSX.Element} responsive media board page
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Images, Search, Newspaper } from "lucide-react";
import { apiMethods } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useSEO } from "../hooks/useSEO";
import "../styles/mediaDashboard.css";

const filters = [
  { value: "all", label: "Everything" },
  { value: "course", label: "Courses" },
  { value: "blog", label: "Blog notes" },
];

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
  const content = (
    <>
      <div className="media-board-image-wrap">
        <img
          src={item.image}
          alt={item.alt}
          className="media-board-image"
          loading="lazy"
          decoding="async"
        />
        <span className="media-board-type">
          {isBlog ? <Newspaper size={14} /> : <BookOpen size={14} />}
          {isBlog ? "Blog note" : "Course"}
        </span>
      </div>
      <div className="media-board-card-body">
        <p className="media-board-topic">{item.topic}</p>
        <h2>{item.title}</h2>
        <p className="media-board-summary">{item.summary}</p>
        <div className="media-board-card-footer">
          <span>{getDateLabel(item.updatedAt)}</span>
          {isBlog ? <ExternalLink size={16} /> : <span>Open</span>}
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

const MediaDashboard = () => {
  const { reducedMotion } = useTheme();
  useSEO({
    title: "Visual Study Board for Courses and Blog Notes",
    description:
      "Browse teacher led courses and useful Vidhgrow blog notes through one responsive media board",
    keywords: "Vidhgrow courses, teacher courses, learning notes, visual study board",
    canonicalUrl: `${window.location.origin}/media`,
    type: "website",
    noindex: false,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Vidhgrow Visual Study Board",
      description:
        "A public collection of approved Vidhgrow course covers and published platform notes",
      url: `${window.location.origin}/media`,
    },
  });
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadBoard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiMethods.get("/api/media-dashboard?limit=24");
        if (!active) return;
        setItems(Array.isArray(response.data?.data?.items) ? response.data.data.items : []);
      } catch {
        if (active) setError("The visual board could not load right now");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadBoard();
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const safeQuery = query.trim().slice(0, 80).toLowerCase();
    return items.filter((item) => {
      const typeMatches = filter === "all" || item.type === filter;
      const text = `${item.title} ${item.summary} ${item.topic}`.toLowerCase();
      return typeMatches && (!safeQuery || text.includes(safeQuery));
    });
  }, [filter, items, query]);

  return (
    <section className={`media-board-shell ${reducedMotion ? "media-board-reduced" : ""}`}>
      <div className="media-board-inner">
        <header className="media-board-header">
          <div className="media-board-kicker">
            <Images size={16} aria-hidden="true" />
            <span>Vidhgrow Media View</span>
          </div>
          <h1>Find the next useful thing to open</h1>
          <p>
            A view of teacher made courses and the notes behind the platform
          </p>
        </header>

        <div className="media-board-controls" aria-label="Media board controls">
          <label className="media-board-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search the visual board</span>
            <input
              type="search"
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value.replace(/[<>]/g, ""))}
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
          <div className="media-board-grid" aria-label="Loading visual board">
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
      </div>
    </section>
  );
};

export default MediaDashboard;
