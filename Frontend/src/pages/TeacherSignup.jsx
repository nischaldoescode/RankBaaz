import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const TeacherSignup = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [expired, setExpired] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    bio: "",
    qualification: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setExpired(true);
      setVerifying(false);
      return;
    }

    axios
      .get(`${API}/teachers/verify-invite?token=${token}`)
      .then((r) => {
        setInviteData(r.data.data);
        setForm((p) => ({ ...p, qualification: r.data.data.qualification || "" }));
      })
      .catch((err) => {
        if (err.response?.data?.code === "LINK_EXPIRED") {
          setExpired(true);
        } else {
          setExpired(true);
        }
      })
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      toast.error("Password must be 8+ chars with upper, lower and number");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/teachers/signup`,
        { token, ...form },
        { withCredentials: true }
      );

      localStorage.setItem("teacher", JSON.stringify(res.data.data.teacher));
      toast.success("Account created. Welcome!");
      navigate("/teacher/dashboard");
    } catch (err) {
      if (err.response?.data?.code === "LINK_EXPIRED") {
        setExpired(true);
      } else {
        toast.error(err.response?.data?.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  if (expired || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-5"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground mb-2">Invite Link Expired</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This invite link has expired. Invite links are valid for 4 minutes only. Please contact us to request a new invitation.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link to="/teacher">Back to Teacher Page</Link>
            </Button>
            <Button asChild className="w-full">
              <a href="mailto:support@vidhgrow.online">Contact Support</a>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome, {inviteData.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete your teacher profile to get started.
          </p>
        </div>

        <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
          <div className="mb-5 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Email:</span> {inviteData.email}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold">Country:</span>{" "}
              {inviteData.country === "india" ? "India" : "Nepal"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Username
              </label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))
                }
                placeholder="your_username"
                required
                className="h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-30 chars, lowercase letters, numbers, underscores
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min 8 chars with upper, lower & number"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Confirm Password
              </label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Repeat your password"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Short Bio (optional)
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="A brief description about you..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Qualification
              </label>
              <textarea
                value={form.qualification}
                onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
                placeholder="Your degrees, certifications, experience..."
                rows={3}
                maxLength={300}
                className="w-full px-3 py-2.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? "Creating account..." : "Create Teacher Account"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default TeacherSignup;