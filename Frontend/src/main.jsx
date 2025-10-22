import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CourseProvider } from './context/CourseContext.jsx'
import { TestProvider } from './context/TestContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './styles/globals.css'

// Register Service Worker for image caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // console.log('[SW] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        // console.error('[SW] Service Worker registration failed:', error);
      });
  });
}

// Initialize cache cleanup on app start
import { cacheManager } from './utils/cacheManager';

// // Clear expired cache entries on startup
// cacheManager.clearExpired().then((cleared) => {
//   if (cleared > 0) {
//     console.log(`[Cache] Cleaned up ${cleared} expired entries on startu`);
//   }
// });

// // Optional: Log cache stats
// cacheManager.getStats().then((stats) => {
//   console.log('[Cache] Statistics:', stats);
// })


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CourseProvider>
          <TestProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </TestProvider>
        </CourseProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)