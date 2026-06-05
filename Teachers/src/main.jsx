/**
 * boots the teacher portal vite app, providers, router, notifications, and global styles
 *
 * @file teachers/src/main.jsx
 * @module teachers/src/main
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
