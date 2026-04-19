import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Users, Award, Globe, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import Loading from "../components/common/Loading";
import axios from "axios";
import toast from "react-hot-toast";
import CourseDetailsExpander from "@/components/testandcourse/CourseDetailsExpander";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const TeacherProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/teachers/public/${username}`)
      .then((r) => setData(r.data.data))
      .catch(() => {
        toast.error("Teacher not found");
        navigate("/courses");
      })
      .finally(() => setLoading(false));
  }, [username, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading variant="page" />
      </div>
    );
  }

  if (!data) return null;

  const { teacher, courses, stats } = data;

  const countryLabel = teacher.country === "india" ? "India" : "Nepal";
  const countryFlag = teacher.country === "india" ? "🇮🇳" : "🇳🇵";
  const joinDate = new Date(teacher.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6 gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* profile header */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* avatar */}
              <div className="flex-shrink-0">
                {teacher.profileImage?.url ? (
                  <img
                    src={teacher.profileImage.url}
                    alt={teacher.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-border flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary">
                      {teacher.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {teacher.name}
                    </h1>
                    <p className="text-muted-foreground">@{teacher.username}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-semibold">
                    Teacher
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    {countryFlag} {countryLabel}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Joined {joinDate}
                  </span>
                </div>

                {teacher.bio && (
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    {teacher.bio}
                  </p>
                )}

                {teacher.qualification && (
                  <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg inline-block">
                    {teacher.qualification}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: BookOpen, label: "Courses", value: stats.totalCourses },
            { icon: Users, label: "Students", value: stats.totalStudents },
            { icon: Award, label: "Tests Taken", value: stats.totalTests },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-4 sm:p-5 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Courses by {teacher.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No published courses yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {courses.map((course, i) => (
                  <motion.div
                    key={course._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    {course.image?.url && (
                      <img
                        src={course.image.url}
                        alt={course.name}
                        className="w-full h-36 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                          {course.name}
                        </h3>
                        <Badge
                          className={`flex-shrink-0 text-xs ${
                            course.isPaid
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {course.isPaid
                            ? `${course.geoRestriction === "nepal" ? "रू" : "₹"}${course.price}`
                            : "Free"}
                        </Badge>
                      </div>

                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{course.totalQuestions} questions</span>
                        {course.geoRestriction && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {course.geoRestriction === "nepal" ? "🇳🇵 Nepal" : "🇮🇳 India"} only
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <CourseDetailsExpander
                          course={course}
                          viewMode="grid"
                          isExpanded={expandedCourseId === course._id}
                          onExpandChange={(expanded) =>
                            setExpandedCourseId(expanded ? course._id : null)
                          }
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherProfile;