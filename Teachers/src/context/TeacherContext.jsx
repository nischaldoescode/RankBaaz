import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { teacherApi } from "../services/api.js";
import { teacherRequestSigner } from "../utils/requestSigning.js";
import toast from "react-hot-toast";

const TeacherContext = createContext(null);

export const TeacherProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherApi.profile.get();
      setTeacher(res.data.data.teacher);
      setCourses(res.data.data.courses || []);
    } catch (err) {
      // only clear session on 401 — not on network errors etc.
      if (err.response?.status === 401) {
        localStorage.removeItem("teacher");
        teacherRequestSigner.clearSigningSecret();
        setTeacher(null);
      }
      // do NOT redirect here — let the ProtectedRoute handle redirection
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // don't attempt auth on public signup/expired routes
    const publicPaths = ["/signup", "/invite-expired", "/login"];
    const currentPath = window.location.pathname;
    const isPublicPath = publicPaths.some((p) => currentPath.startsWith(p));

    if (isPublicPath) {
      setInitializing(false);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem("teacher");
    if (!stored) {
      setInitializing(false);
      setLoading(false);
      return;
    }

    teacherRequestSigner.loadSigningSecret();
    fetchProfile().finally(() => setInitializing(false));
  }, [fetchProfile]);

  const login = async (credentials) => {
    const res = await teacherApi.auth.login(credentials);
    const data = res.data.data;
    localStorage.setItem("teacher", JSON.stringify(data.teacher));
    if (data.signingSecret) {
      teacherRequestSigner.setSigningSecret(
        data.signingSecret,
        data.signingSecretExpiresIn,
      );
    }
    setTeacher(data.teacher);
    return res.data;
  };

  const logout = async () => {
    await teacherApi.auth.logout().catch(() => {});
    localStorage.removeItem("teacher");
    teacherRequestSigner.clearSigningSecret();
    setTeacher(null);
    setCourses([]);
  };

  const updateTeacher = (updated) => setTeacher((p) => ({ ...p, ...updated }));

  return (
    <TeacherContext.Provider
      value={{
        teacher,
        courses,
        setCourses,
        loading,
        initializing,
        fetchProfile,
        login,
        logout,
        updateTeacher,
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacher must be used within TeacherProvider");
  return ctx;
};
