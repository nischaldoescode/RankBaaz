import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Loading from "../components/common/Loading";

const API = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

// This route handles /@username — could be a student or teacher
// We check teacher first, then fall back to student public profile
const TeacherOrUserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // check if teacher exists
    axios
      .get(`${API}/teachers/public/${username}`)
      .then(() => {
        // is a teacher — redirect to teacher profile page
        navigate(`/teacher/@${username}`, { replace: true });
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          // not a teacher — redirect to student public profile
          navigate(`/profile/@${username}`, { replace: true });
        } else {
          navigate("/404", { replace: true });
        }
      })
      .finally(() => setChecking(false));
  }, [username, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading variant="page" />
    </div>
  );
};

export default TeacherOrUserProfile;