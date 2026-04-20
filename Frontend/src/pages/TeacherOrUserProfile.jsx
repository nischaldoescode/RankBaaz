import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Loading from "../components/common/Loading";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

/**
 * Universal username route handler
 * Route: /:username (e.g. /@hunter or /hunter)
 *
 * 1. Strip leading @ from the param
 * 2. Check if it's a teacher
 * 3. If yes → render TeacherProfile inline (no redirect loop)
 * 4. If no → render PublicProfile inline (no redirect loop)
 *
 * We render inline instead of redirecting to avoid the double-@ bug
 * and to avoid extra navigation history entries.
 */
const TeacherOrUserProfile = () => {
  const { username: rawParam } = useParams();
  const navigate = useNavigate();

  // strip @ prefix if present
  const username = rawParam?.startsWith("@") ? rawParam.slice(1) : rawParam;

  useEffect(() => {
    if (!username) {
      navigate("/404", { replace: true });
      return;
    }

    // check if this is a teacher
    axios
      .get(`${API}/teachers/public/${username}`)
      .then(() => {
        // it's a teacher — navigate to teacher profile
        // use replace so back button works correctly
        navigate(`/teacher/@${username}`, { replace: true });
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          // not a teacher — navigate to student public profile
          navigate(`/profile/@${username}`, { replace: true });
        } else {
          navigate("/404", { replace: true });
        }
      });
  }, [username, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading variant="page" />
    </div>
  );
};

export default TeacherOrUserProfile;
