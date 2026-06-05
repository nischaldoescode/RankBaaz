/**
 * boots the admin vite app, providers, router, notifications, and global styles
 *
 * @file admin/src/main.jsx
 * @module admin/src/main
 * @exports vite entry module for browser startup
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
