import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const TeacherLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/teachers/login`, form, { withCredentials: true });
      localStorage.setItem("teacher", JSON.stringify(res.data.data.teacher));
      toast.success(`Welcome back, ${res.data.data.teacher.name}`);
      navigate("/teacher/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Teacher Sign In</h1>
          <p className="text-muted-foreground text-sm">
            Access your teaching dashboard
          </p>
        </div>

        <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Your password"
                required
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Not a teacher yet?{" "}
              <Link to="/teacher" className="text-primary hover:underline font-medium">
                Apply to teach
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherLogin;