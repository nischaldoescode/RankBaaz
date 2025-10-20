import React, { createContext, useContext, useReducer, useEffect } from "react";
import { apiMethods, handleApiError } from "../services/api";
import toast from "react-hot-toast";

// Initial state
const initialState = {
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: "SET_LOADING",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGOUT: "LOGOUT",
  SET_USER: "SET_USER",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  UPDATE_PROFILE: "UPDATE_PROFILE",
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const userData = localStorage.getItem("user");

      if (userData) {
        const user = JSON.parse(userData);
        // console.log("[INIT_AUTH] Found user in localStorage:", user.email);

        try {
          const response = await apiMethods.auth.getProfile();
          const validatedUser = response.data?.data?.user;

          if (!validatedUser) {
            clearAuthData();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
            return;
          }


          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: validatedUser,
              token: null,
            },
          });
        } catch (error) {
          console.error( {
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
          });

          clearAuthData();
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiMethods.auth.login(credentials);

      // Backend returns { success, data: { user } }
      const user = response.data?.data?.user;

      if (!user) {
        throw new Error("User data not received from server");
      }


      // Store user data only (no token needed - it's in httpOnly cookie)
      localStorage.setItem("user", JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token: null }, // token is null because it's in httpOnly cookie
      });

      toast.success(`Welcome back, ${user.name}!`);
      return { success: true, user };
    } catch (error) {
      const errorMessage = handleApiError(error, "Login failed");
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const validateRegistration = (userData) => {
    const errors = {};

    // First name validation
    if (!userData.firstName?.trim()) {
      errors.firstName = "First name is required";
    } else if (
      userData.firstName.trim().length < 2 ||
      userData.firstName.trim().length > 50
    ) {
      errors.firstName = "First name must be between 2-50 characters";
    }

    // Last name validation
    if (!userData.lastName?.trim()) {
      errors.lastName = "Last name is required";
    } else if (
      userData.lastName.trim().length < 2 ||
      userData.lastName.trim().length > 50
    ) {
      errors.lastName = "Last name must be between 2-50 characters";
    }

    // Email validation
    // Email validation
    if (!userData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email.trim())) {
      errors.email = "Please enter a valid email address";
    } else {
      const allowedDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
        "protonmail.com",
        "zoho.com",
        "aol.com",
      ];
      const domain = userData.email.trim().split("@")[1];
      if (!allowedDomains.includes(domain)) {
        errors.email =
          "Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)";
      }
    }

    // Password validation
    if (!userData.password) {
      errors.password = "Password is required";
    } else if (userData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      errors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    // Date of Birth validation (DD/MM/YYYY format)
    if (!userData.dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else {
      // Validate format DD/MM/YYYY
      const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = userData.dateOfBirth.match(datePattern);

      if (!match) {
        errors.dateOfBirth = "Please enter date in DD/MM/YYYY format";
      } else {
        const [, day, month, year] = match;
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);

        // Validate day, month ranges
        if (dayNum < 1 || dayNum > 31) {
          errors.dateOfBirth = "Day must be between 01 and 31";
        } else if (monthNum < 1 || monthNum > 12) {
          errors.dateOfBirth = "Month must be between 01 and 12";
        } else if (yearNum < 1900) {
          errors.dateOfBirth = "Please enter a valid year";
        } else {
          // Create date object (month is 0-indexed in JS)
          const dob = new Date(yearNum, monthNum - 1, dayNum);
          const today = new Date();

          // Check if date is valid (handles invalid dates like 31/02/2000)
          if (
            dob.getDate() !== dayNum ||
            dob.getMonth() !== monthNum - 1 ||
            dob.getFullYear() !== yearNum
          ) {
            errors.dateOfBirth = "Please enter a valid date";
          } else if (dob > today) {
            errors.dateOfBirth = "Date of birth cannot be in the future";
          } else {
            // Calculate age
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const actualAge =
              monthDiff < 0 ||
              (monthDiff === 0 && today.getDate() < dob.getDate())
                ? age - 1
                : age;

            if (actualAge < 15) {
              errors.dateOfBirth =
                "You must be at least 15 years old to register";
            } else if (actualAge > 100) {
              errors.dateOfBirth = "Please enter a valid date of birth";
            }
          }
        }
      }
    }

    // Gender validation
    if (!userData.gender) {
      errors.gender = "Gender is required";
    } else if (!["Male", "Female", "Other"].includes(userData.gender)) {
      errors.gender = "Please select a valid gender";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      // Validate on frontend first
      const validation = validateRegistration(userData);
      if (!validation.isValid) {
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: validation.errors });
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return { success: false, errors: validation.errors };
      }
      // Parse DD/MM/YYYY to Date object and calculate age
      const [day, month, year] = userData.dateOfBirth.split("/");
      const dob = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const calculatedAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
          ? age - 1
          : age;

      // Convert to ISO format for backend
      const isoDateOfBirth = dob.toISOString();

      // Add calculated age and ISO date to userData
      const registrationData = {
        ...userData,
        age: calculatedAge,
        dateOfBirth: isoDateOfBirth,
      };

      const response = await apiMethods.auth.register(registrationData);

      // Check if OTP verification is needed
      if (response.data.success && response.data.data.otpSent) {
        // Don't log in yet, just return success with email
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return {
          success: true,
          requiresOtp: true,
          email: userData.email,
        };
      }

      // If no OTP required (shouldn't happen normally)
      const { user } = response.data.data;
      localStorage.setItem("user", JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token: null },
      });

      toast.success(`Welcome to TestMaster Pro, ${user.name}!`);
      return { success: true, user };
    } catch (error) {
      const errorMessage = handleApiError(error, "Registration failed");
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const verifyRegistrationOtp = async (email, otp, username = null) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await apiMethods.auth.verifyRegistrationOtp(
        email,
        otp,
        username
      );

      if (response.data.success) {
        // If username was provided, user is created - log them in
        if (username && response.data.data.user) {
          const { user } = response.data.data;

          localStorage.setItem("user", JSON.stringify(user));

          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user, token: null },
          });

          toast.success(`Welcome to TestMaster Pro, ${user.name}!`);
          return { success: true, user };
        }

        // Otherwise, just OTP verification success
        return { success: true, otpVerified: true };
      }
    } catch (error) {
      const errorMessage = handleApiError(
        error,
        username ? "Registration failed" : "OTP verification failed"
      );
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const logout = async () => {
    try {
      await apiMethods.auth.logout();
    } catch (error) {
      console.error( error);
    } finally {
      clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success("Logged out successfully");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await apiMethods.auth.updateProfile(profileData);
      const updatedUser = response.data.data.user; // Fixed: added .data

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));

      dispatch({
        type: AUTH_ACTIONS.UPDATE_PROFILE,
        payload: updatedUser,
      });

      // Only show success toast for non-visibility changes
      if (!profileData.nameVisibility) {
        toast.success("Profile updated successfully");
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      const errorMessage = handleApiError(error, "Profile update failed");
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const changePassword = async (passwordData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await apiMethods.auth.changePassword(passwordData);

      toast.success("Password changed successfully");
      return { success: true };
    } catch (error) {
      const errorMessage = handleApiError(error, "Password change failed");
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    register,
    verifyRegistrationOtp,
    logout,
    updateProfile,
    changePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
