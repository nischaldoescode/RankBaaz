import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  theme: 'dark', // default to dark theme
  primaryColor: 'blue',
  animations: true,
  reducedMotion: false,
  fontSize: 'medium',
  language: 'en',
};

// Action types
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_PRIMARY_COLOR: 'SET_PRIMARY_COLOR',
  TOGGLE_ANIMATIONS: 'TOGGLE_ANIMATIONS',
  SET_REDUCED_MOTION: 'SET_REDUCED_MOTION',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  RESET_THEME: 'RESET_THEME',
};

// Reducer function
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };

    case THEME_ACTIONS.SET_PRIMARY_COLOR:
      return {
        ...state,
        primaryColor: action.payload,
      };

    case THEME_ACTIONS.TOGGLE_ANIMATIONS:
      return {
        ...state,
        animations: !state.animations,
      };

    case THEME_ACTIONS.SET_REDUCED_MOTION:
      return {
        ...state,
        reducedMotion: action.payload,
      };

    case THEME_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        fontSize: action.payload,
      };

    case THEME_ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload,
      };

    case THEME_ACTIONS.RESET_THEME:
      return initialState;

    default:
      return state;
  }
};

// Create context
const ThemeContext = createContext();

// Provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-preferences');
    if (savedTheme) {
      try {
        const themeData = JSON.parse(savedTheme);
        Object.entries(themeData).forEach(([key, value]) => {
          switch (key) {
            case 'theme':
              dispatch({ type: THEME_ACTIONS.SET_THEME, payload: value });
              break;
            case 'primaryColor':
              dispatch({ type: THEME_ACTIONS.SET_PRIMARY_COLOR, payload: value });
              break;
            case 'animations':
              if (!value) dispatch({ type: THEME_ACTIONS.TOGGLE_ANIMATIONS });
              break;
            case 'reducedMotion':
              dispatch({ type: THEME_ACTIONS.SET_REDUCED_MOTION, payload: value });
              break;
            case 'fontSize':
              dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: value });
              break;
            case 'language':
              dispatch({ type: THEME_ACTIONS.SET_LANGUAGE, payload: value });
              break;
          }
        });
      } catch (error) {
        console.error('Failed to load theme preferences:', error);
      }
    }

    // Check for system preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      dispatch({ type: THEME_ACTIONS.SET_REDUCED_MOTION, payload: true });
    }

    // Listen for changes to reduced motion preference
    const handleMotionChange = (e) => {
      dispatch({ type: THEME_ACTIONS.SET_REDUCED_MOTION, payload: e.matches });
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme-preferences', JSON.stringify(state));
    
    // Apply theme to document
    document.documentElement.className = `theme-${state.theme} color-${state.primaryColor} font-${state.fontSize}`;
    
    // Apply reduced motion
    if (state.reducedMotion || !state.animations) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.style.setProperty('--transition-duration', '0s');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  }, [state]);

  const setTheme = (theme) => {
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: theme });
  };

  const setPrimaryColor = (color) => {
    dispatch({ type: THEME_ACTIONS.SET_PRIMARY_COLOR, payload: color });
  };

  const toggleAnimations = () => {
    dispatch({ type: THEME_ACTIONS.TOGGLE_ANIMATIONS });
  };

  const setFontSize = (size) => {
    dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: size });
  };

  const setLanguage = (language) => {
    dispatch({ type: THEME_ACTIONS.SET_LANGUAGE, payload: language });
  };

  const resetTheme = () => {
    dispatch({ type: THEME_ACTIONS.RESET_THEME });
  };

  // Theme utilities
  const isDark = state.theme === 'dark';
  const isLight = state.theme === 'light';

  const getThemeClasses = () => {
    return {
      background: isDark ? 'bg-slate-900' : 'bg-gray-50',
      surface: isDark ? 'bg-slate-800' : 'bg-white',
      text: isDark ? 'text-slate-100' : 'text-gray-900',
      textSecondary: isDark ? 'text-slate-400' : 'text-gray-600',
      border: isDark ? 'border-slate-700' : 'border-gray-200',
      input: isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300',
    };
  };

  const getPrimaryColorClasses = () => {
    const colorMap = {
      blue: {
        primary: 'text-blue-500',
        bg: 'bg-blue-500',
        bgHover: 'hover:bg-blue-600',
        border: 'border-blue-500',
        borderHover: 'hover:border-blue-600',
        gradient: 'from-blue-500 to-blue-600',
        shadow: 'shadow-blue-500/25',
      },
      purple: {
        primary: 'text-purple-500',
        bg: 'bg-purple-500',
        bgHover: 'hover:bg-purple-600',
        border: 'border-purple-500',
        borderHover: 'hover:border-purple-600',
        gradient: 'from-purple-500 to-purple-600',
        shadow: 'shadow-purple-500/25',
      },
      green: {
        primary: 'text-green-500',
        bg: 'bg-green-500',
        bgHover: 'hover:bg-green-600',
        border: 'border-green-500',
        borderHover: 'hover:border-green-600',
        gradient: 'from-green-500 to-green-600',
        shadow: 'shadow-green-500/25',
      },
      red: {
        primary: 'text-red-500',
        bg: 'bg-red-500',
        bgHover: 'hover:bg-red-600',
        border: 'border-red-500',
        borderHover: 'hover:border-red-600',
        gradient: 'from-red-500 to-red-600',
        shadow: 'shadow-red-500/25',
      },
      indigo: {
        primary: 'text-indigo-500',
        bg: 'bg-indigo-500',
        bgHover: 'hover:bg-indigo-600',
        border: 'border-indigo-500',
        borderHover: 'hover:border-indigo-600',
        gradient: 'from-indigo-500 to-indigo-600',
        shadow: 'shadow-indigo-500/25',
      },
    };

    return colorMap[state.primaryColor] || colorMap.blue;
  };

  const getFontSizeClasses = () => {
    const sizeMap = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };

    return sizeMap[state.fontSize] || sizeMap.medium;
  };

  const value = {
    ...state,
    setTheme,
    setPrimaryColor,
    toggleAnimations,
    setFontSize,
    setLanguage,
    resetTheme,
    isDark,
    isLight,
    getThemeClasses,
    getPrimaryColorClasses,
    getFontSizeClasses,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;