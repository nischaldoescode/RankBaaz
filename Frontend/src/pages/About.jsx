import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Heart,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  Zap,
  Shield,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useContent } from "../context/ContentContext";
import { Link } from "react-router-dom";
import Loading from "../components/common/Loading";
import { useSEO } from "../hooks/useSEO";
// Icon mapping
const iconMap = {
  Target,
  Heart,
  Users,
  Award,
  BookOpen,
  Zap,
  TrendingUp,
  Shield,
};
import { useHead } from '@unhead/react';

const About = () => {
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, loading } = useContent();

  useSEO({
    title: 'About Us',
    description: contentSettings?.siteDescription || "Learn about our mission to transform education through intelligent testing and personalized learning experiences.",
    keywords: 'about us, mission, values, education platform, online learning',
    type: 'website',
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

if (loading || !contentSettings) {
    return <Loading variant="page" />;
  }
  // Fallback values if content not loaded
  const values = contentSettings?.aboutValues || [];
  const features = contentSettings?.aboutFeatures || [];
  const stats = contentSettings?.aboutStats || [];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animations && !reducedMotion ? "hidden" : "visible"}
          animate="visible"
          variants={containerVariants}
          className="space-y-16"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              About {contentSettings?.siteName || "RankBaaz"}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {contentSettings?.siteDescription ||
                "We're on a mission to transform how students learn and prepare for exams through intelligent testing and personalized insights."}
            </p>
          </motion.div>

          {/* Stats Section */}
          {stats.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Values Section */}
          {values.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  What Drives Us
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Our core values shape every decision we make and every feature we
                  build
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {values.map((value, index) => {
                  const IconComponent = iconMap[value.icon] || Target;
                  return (
                    <div
                      key={index}
                      className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-shadow"
                    >
                      <div
                        className={`w-14 h-14 ${value.bgColor} rounded-xl flex items-center justify-center mb-6`}
                      >
                        <IconComponent className={`w-7 h-7 ${value.color}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        {value.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Features Grid */}
          {features.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Platform Features
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need to succeed in your learning journey
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                  const IconComponent = iconMap[feature.icon] || BookOpen;
                  return (
                    <div
                      key={index}
                      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
                    >
                      <IconComponent className="w-8 h-8 text-primary mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-8 md:p-12 text-center"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our community of learners and experience personalized education
              like never before
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
              >
                Get Started Free
              </Link>

              <Link
                to="/courses"
                className="px-8 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors font-medium cursor-pointer"
              >
                Browse Courses
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default About;