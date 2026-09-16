import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar, Footer } from './components/Layout';
import Home from './pages/Home';
import Events from './pages/Events';
import Team from './pages/Team';
import Members from './pages/Members';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Verticals from './pages/Verticals/index';
import DepartmentPage from './pages/Verticals/DepartmentPage';
import './App.css';

// Hostnames this SPA serves. Anything else renders a blocked notice and
// makes zero API calls. `npm run dev` always bypasses the check so local
// development and branch previews keep working until allowlisted at build.
const ALLOWED_HOSTS = (import.meta.env.VITE_ALLOWED_HOSTS || 'acmiiitu.in,www.acmiiitu.in,localhost,127.0.0.1')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function hostAllowed() {
  if (import.meta.env.DEV) return true;
  return ALLOWED_HOSTS.includes(window.location.hostname.toLowerCase());
}

function HostBlocked() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <div className="max-w-sm text-center">
        <img src="/iiitu-acm.jpeg" alt="IIITU ACM" className="w-10 h-10 rounded-xl object-cover mx-auto mb-4" />
        <h1 className="text-lg font-bold text-text-primary">Not served here</h1>
        <p className="text-sm text-text-secondary mt-2">
          The IIITU ACM site is only served from <span className="font-mono font-semibold">acmiiitu.in</span>.
        </p>
      </div>
    </div>
  );
}

function Shell({ theme, toggleTheme }) {
  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary">
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Legacy admin URLs keep working */}
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route
          path="*"
          element={
            <>
              <Navbar theme={theme} toggleTheme={toggleTheme} />
              <main className="flex-grow flex flex-col">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/verticals" element={<Verticals />} />
                  <Route path="/verticals/:slug" element={<DepartmentPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!hostAllowed()) return <HostBlocked />;

  return (
    <Router>
      <AuthProvider>
        <Shell theme={theme} toggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} />
      </AuthProvider>
    </Router>
  );
}

export default App;
