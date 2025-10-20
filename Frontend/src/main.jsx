import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CourseProvider } from './context/CourseContext.jsx'
import { TestProvider } from './context/TestContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './styles/globals.css'

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