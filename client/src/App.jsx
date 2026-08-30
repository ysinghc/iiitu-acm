import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Team from './pages/Team';
import Members from './pages/Members';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Verticals from './pages/Verticals/index';
import DepartmentPage from './pages/Verticals/DepartmentPage';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-bg-primary text-text-primary">
        {/* Only show standard navbar/footer on non-admin dashboard routes */}
        <Routes>
          <Route
            path="/admin"
            element={<AdminDashboard theme={theme} toggleTheme={toggleTheme} />}
          />
          <Route
            path="*"
            element={
              <>
                <Navbar theme={theme} toggleTheme={toggleTheme} />
                <main className="flex-grow flex flex-col">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/verticals" element={<Verticals />} />
                    <Route path="/verticals/:slug" element={<DepartmentPage />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
