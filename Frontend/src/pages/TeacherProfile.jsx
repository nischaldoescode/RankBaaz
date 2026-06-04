/**
 * keeps the teacher profile page focused and readable.
 */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import Loading from "../components/common/Loading";
import NotFound from "./NotFound";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";
const DICEBEAR = (seed) =>
  `https://api.dicebear.com/9.x/croodles-neutral/svg?seed=${encodeURIComponent(seed)}`;

const TeacherProfile = () => {
  const { username: rawUsername } = useParams();
  // accept both /@username and /teacher/@username.
  const username = rawUsername?.startsWith("@")
    ? rawUsername.slice(1)
    : rawUsername;

  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    axios
      .get(`${API}/teachers/public/${username}`)
      .then((r) => setData(r.data.data))
      .catch((err) => {
        // not found and blocked teachers share the same public 404.
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Loading variant="page" />
      </div>
    );
  }

  if (notFound || !data) {
    // use the shared 404 page.
    return <NotFound />;
  }

  const { teacher, courses, stats } = data;
  const badges = data.badges || [];
  const reviews = data.reviews || [];
  const avatarUrl = teacher.profileImage?.url || DICEBEAR(teacher.username);
  const joinDate = new Date(teacher.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen pt-16 pb-10 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>

        {/* hero card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden mb-5 shadow-sm"
        >
          {/* top gradient bar */}
          <div
            className="h-24 sm:h-32 w-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.05))",
            }}
          />

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 -mt-12 sm:-mt-14">
            {/* avatar */}
            <div className="flex items-end justify-between mb-4">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={teacher.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-background object-cover bg-muted shadow-md"
                  onError={(e) => {
                    // fallback to dicebear if image 404s
                    e.target.src = DICEBEAR(teacher.username);
                  }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-background"
                  title="Active teacher"
                />
              </div>

              <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                Teacher
              </span>
            </div>

            {/* name + username */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              {teacher.name}
            </h1>
            <p className="text-muted-foreground text-sm mb-3">
              @{teacher.username}
            </p>

            {/* meta */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
              <span>
                {teacher.country === "india" ? "India" : "Nepal"}
              </span>
              <span>Joined {joinDate}</span>
            </div>

            {/* bio */}
            {teacher.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed mb-4 max-w-xl">
                {teacher.bio}
              </p>
            )}

            {/* qualification chip */}
            {teacher.qualification && (
              <span className="inline-block px-3 py-1.5 bg-muted text-xs text-muted-foreground rounded-lg">
                {teacher.qualification}
              </span>
            )}
          </div>
        </motion.div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {badges.map((badge) => (
              <span
                key={badge.key}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm"
                title={badge.description}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4 mb-5">
          {[
            { label: "Courses", value: stats.totalCourses },
            { label: "Students", value: stats.totalStudents },
            { label: "Tests Taken", value: stats.totalTests },
            { label: "Completion", value: `${stats.completionRate || 0}%` },
            {
              label: "Rating",
              value:
                stats.reviewCount > 0
                  ? `${stats.averageRating}/5`
                  : "No ratings",
            },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center shadow-sm"
            >
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {s.value}
              </p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* courses */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 sm:px-7 py-4 border-b border-border">
            <h2 className="font-bold text-foreground">
              Courses by {teacher.name}
            </h2>
          </div>

          {courses.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No published courses yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {courses.map((course, i) => {
                const currencySymbol =
                  course.geoRestriction === "nepal" ? "रू" : "₹";
                return (
                  <motion.div
                    key={course._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-4 p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                  >
                    {/* course image */}
                    <div className="flex-shrink-0">
                      {course.image?.url ? (
                        <img
                          src={course.image.url}
                          alt={course.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-border"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-primary"
                          >
                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                          {course.name}
                        </h3>
                        <span
                          className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            course.isPaid
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {course.isPaid
                            ? `${currencySymbol}${course.price}`
                            : "Free"}
                        </span>
                      </div>

                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{course.totalQuestions} questions</span>
                        {course.geoRestriction && (
                          <span className="px-2 py-0.5 bg-muted rounded-full">
                            {course.geoRestriction === "nepal"
                              ? "Nepal only"
                              : "India only"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mt-5">
          <div className="px-5 sm:px-7 py-4 border-b border-border">
            <h2 className="font-bold text-foreground">Student Feedback</h2>
          </div>

          {reviews.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No public feedback yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <div key={review._id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {review.user?.name || review.user?.username || "Student"}
                      </p>
                      {review.course?.name && (
                        <p className="text-xs text-muted-foreground">
                          {review.course.name}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {review.rating}/5
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {review.feedback}
                  </p>
                  {review.badges?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
