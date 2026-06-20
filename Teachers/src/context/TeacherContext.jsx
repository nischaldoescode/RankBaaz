/**
 * provides teacher context state, auth checks, profile data, and shared actions to dashboard views
 *
 * @file teachers/src/context/teachercontext.jsx
 * @module teachers/src/context/teachercontext
 * @exports provider and hooks used by child components
 */

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

const normalizeProfilePayload = (payload) => {
  const data = payload?.data?.data;
  if (!data) return { teacher: null, courses: [] };

  if (data.teacher) {
    return {
      teacher: data.teacher,
      courses: Array.isArray(data.courses) ? data.courses : [],
    };
  }

  return {
    teacher: data,
    courses: [],
  };
};

export const TeacherProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await teacherApi.notifications.list();
      const data = res.data?.data || {};
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadNotifications(data.unreadCount || 0);
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherApi.profile.get();
      const { teacher: profileTeacher, courses: profileCourses } =
        normalizeProfilePayload(res);

      if (!profileTeacher?._id && !profileTeacher?.id) {
        localStorage.removeItem("teacher");
        setTeacher(null);
        setCourses([]);
        return false;
      }

      setTeacher(profileTeacher);
      setCourses(profileCourses);
      localStorage.setItem("teacher", JSON.stringify(profileTeacher));
      fetchNotifications();
      return true;
    } catch (err) {
      // only clear session on 401
      if (err.response?.status === 401) {
        localStorage.removeItem("teacher");
        teacherRequestSigner.clearSigningSecret();
        setTeacher(null);
        setNotifications([]);
        setUnreadNotifications(0);
      }
      // protected routes handle redirection
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    // signup and expired invite pages do not represent an active session
    const publicPaths = ["/signup", "/invite-expired"];
    const currentPath = window.location.pathname;
    const isPublicPath = publicPaths.some((p) => currentPath.startsWith(p));

    if (isPublicPath) {
      setInitializing(false);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem("teacher");
    if (stored) {
      try {
        setTeacher(JSON.parse(stored));
      } catch {
        localStorage.removeItem("teacher");
      }
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
    fetchNotifications();
    return res.data;
  };

  const logout = async () => {
    await teacherApi.auth.logout().catch(() => {});
    localStorage.removeItem("teacher");
    teacherRequestSigner.clearSigningSecret();
    setTeacher(null);
    setCourses([]);
    setNotifications([]);
    setUnreadNotifications(0);
  };

  const updateTeacher = (updated) => setTeacher((p) => ({ ...p, ...updated }));

  const markNotificationRead = async (notificationId) => {
    if (!notificationId) return false;
    try {
      await teacherApi.notifications.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item,
        ),
      );
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
      return true;
    } catch {
      return false;
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await teacherApi.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, readAt: item.readAt || readAt })),
      );
      setUnreadNotifications(0);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <TeacherContext.Provider
      value={{
        teacher,
        courses,
        setCourses,
        notifications,
        unreadNotifications,
        loading,
        initializing,
        fetchProfile,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
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
