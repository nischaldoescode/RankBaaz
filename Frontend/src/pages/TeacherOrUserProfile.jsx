/**
 * renders the public teacher or user profile page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/teacheroruserprofile.jsx
 * @module frontend/src/pages/teacheroruserprofile
 * @exports route component rendered by the client router
 */

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Loading from "../components/common/Loading";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

/**
 * universal username route handler
 * route: /:username (e.g. /@hunter or /hunter)
 *
 * 1. strip leading @ from the param
 * 2. check if it's a teacher
 * 3. render teacherprofile inline when the username belongs to a teacher
 * 4. render publicprofile inline for regular user profiles
 *
 * we render inline instead of redirecting to avoid the double-@ bug
 * and to avoid extra navigation history entries
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
        // route teacher usernames to teacher profiles
        // use replace so back button works correctly
        navigate(`/teacher/@${username}`, { replace: true });
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          // otherwise show the student profile
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
