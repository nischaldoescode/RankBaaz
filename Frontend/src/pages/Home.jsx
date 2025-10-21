import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  ArrowRight,
  Target,
  Trophy,
  Rocket,
  Zap,
  Shield,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useContent } from "../context/ContentContext";
import Loading from "../components/common/Loading";

// Icon mapping
const iconMap = {
  Brain,
  BookOpen,
  Award,
  Users,
  TrendingUp,
  Target,
  Trophy,
  Rocket,
  Zap,
  Shield,
  Lightbulb,
};

const Home = () => {
  const [email, setEmail] = useState("");
  const { isAuthenticated } = useAuth();
  const { animations, reducedMotion } = useTheme();
  const { contentSettings, faqs, fetchFAQs, loading } = useContent();

  useEffect(() => {
    // Fetch first 5 FAQs for home page
    fetchFAQs();
  }, []);

  // Convert stats data for charts
  const chartData =
    contentSettings?.stats?.map((stat) => ({
      name: stat.label,
      value: parseInt(stat.value.replace(/[^0-9]/g, "")) || 0,
      displayValue: stat.value,
    })) || [];

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    console.log("Email submitted:", email);
    setEmail("");
  };

  // Render chart based on configuration
  const renderChart = () => {
    const chartConfig = contentSettings?.chartConfig;

    if (!chartConfig?.enabled || chartData.length === 0) {
      return null;
    }

    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

    switch (chartConfig.type) {
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "doughnut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (loading && !contentSettings) {
    return <Loading variant="page" />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto text-center w-full">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 30 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            transition={animations && !reducedMotion ? { duration: 0.8 } : {}}
            className="space-y-8"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              {contentSettings?.heroTitle || "Master Your Skills with"}
              <span className="text-primary block">
                {contentSettings?.heroHighlight || "Advanced Testing"}
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {contentSettings?.heroDescription ||
                "Experience personalized learning. Track your progress, identify strengths, and achieve your goals faster than ever."}
            </p>

            {isAuthenticated && (
              <motion.div
                initial={
                  animations && !reducedMotion ? { opacity: 0, y: 20 } : {}
                }
                animate={
                  animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                }
                transition={animations && !reducedMotion ? { delay: 0.6 } : {}}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button asChild size="lg">
                  <Link to="/courses">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Explore Courses
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/courses">
                    <Award className="w-4 h-4 mr-2" />
                    Take a Test
                  </Link>
                </Button>
              </motion.div>
            )}

            {!isAuthenticated && (
              <motion.div
                initial={
                  animations && !reducedMotion ? { opacity: 0, y: 20 } : {}
                }
                animate={
                  animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                }
                transition={animations && !reducedMotion ? { delay: 0.6 } : {}}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button asChild size="lg">
                  <Link to="/register">
                    Get Started Free
                    <Rocket className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">Sign In</Link>
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div
            className={`grid ${
              contentSettings?.chartConfig?.enabled &&
              contentSettings?.chartConfig?.position === "left"
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1 lg:grid-cols-2"
            } gap-12 items-center`}
          >
            {/* Chart on Left */}
            {contentSettings?.chartConfig?.enabled &&
              contentSettings?.chartConfig?.position === "left" && (
                <motion.div
                  initial={
                    animations && !reducedMotion
                      ? { opacity: 0, scale: 0.8 }
                      : {}
                  }
                  whileInView={
                    animations && !reducedMotion ? { opacity: 1, scale: 1 } : {}
                  }
                  viewport={{ once: true }}
                  transition={
                    animations && !reducedMotion ? { delay: 0.3 } : {}
                  }
                  className="h-80 order-1 lg:order-1"
                >
                  {renderChart()}
                </motion.div>
              )}

            {/* Stats Grid */}
            <div
              className={`grid grid-cols-2 gap-6 ${
                contentSettings?.chartConfig?.enabled &&
                contentSettings?.chartConfig?.position === "left"
                  ? "order-2 lg:order-2"
                  : "order-1"
              }`}
            >
              {contentSettings?.stats?.map((stat, index) => {
                const IconComponent = iconMap[stat.icon] || Users;
                return (
                  <motion.div
                    key={index}
                    initial={
                      animations && !reducedMotion ? { opacity: 0, y: 20 } : {}
                    }
                    whileInView={
                      animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                    }
                    viewport={{ once: true }}
                    transition={
                      animations && !reducedMotion ? { delay: index * 0.1 } : {}
                    }
                    className="text-center"
                  >
                    <div className="w-12 h-12 bg-primary/30 rounded-xl mx-auto mb-4 flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Chart on Right */}
            {contentSettings?.chartConfig?.enabled &&
              contentSettings?.chartConfig?.position === "right" && (
                <motion.div
                  initial={
                    animations && !reducedMotion
                      ? { opacity: 0, scale: 0.8 }
                      : {}
                  }
                  whileInView={
                    animations && !reducedMotion ? { opacity: 1, scale: 1 } : {}
                  }
                  viewport={{ once: true }}
                  transition={
                    animations && !reducedMotion ? { delay: 0.3 } : {}
                  }
                  className="h-80 order-2"
                >
                  {renderChart()}
                </motion.div>
              )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 30 } : {}}
            whileInView={
              animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
            }
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              {contentSettings?.featuresTitle || "Why Choose"}{" "}
              <span className="text-primary">
                {contentSettings?.siteName || "TestMaster Pro"}
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {contentSettings?.featuresDescription ||
                "Our platform combines cutting-edge technology with proven learning methodologies."}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {contentSettings?.features?.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Brain;
              return (
                <motion.div
                  key={index}
                  initial={
                    animations && !reducedMotion ? { opacity: 0, y: 20 } : {}
                  }
                  whileInView={
                    animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
                  }
                  viewport={{ once: true }}
                  transition={
                    animations && !reducedMotion ? { delay: index * 0.2 } : {}
                  }
                >
                  <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-primary/15 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                        <IconComponent className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            whileInView={
              animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
            }
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold">
                {contentSettings?.ctaTitle ||
                  "Ready to Transform Your Learning Journey?"}
              </h2>
              <p className="text-xl text-muted-foreground">
                {contentSettings?.ctaDescription ||
                  "Join thousands of learners accelerating their growth with personalized testing."}
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <form
                onSubmit={handleEmailSubmit}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Input
                  type="email"
                  placeholder="Enter your email to get started"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-12 text-base"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="whitespace-nowrap h-12 px-8"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faqs"
        className="relative py-20 px-4 sm:px-6 lg:px-8 bg-muted/30"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 30 } : {}}
            whileInView={
              animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
            }
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Get answers to common questions about our platform and features.
            </p>
          </motion.div>

          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            whileInView={
              animations && !reducedMotion ? { opacity: 1, y: 0 } : {}
            }
            viewport={{ once: true }}
            transition={animations && !reducedMotion ? { delay: 0.2 } : {}}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.slice(0, 5).map((faq, index) => (
                <AccordionItem
                  key={faq._id || index}
                  value={`item-${index}`}
                  className="border-2 border-border/60 hover:border-primary/50 rounded-lg px-6 bg-background/50 hover:bg-background transition-all duration-200"
                >
                  <AccordionTrigger className="text-left hover:no-underline font-semibold text-foreground py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground/80 leading-relaxed pt-2 pb-4 text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
