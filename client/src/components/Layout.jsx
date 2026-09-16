import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SiteFooter from './Footer';

const LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Events', path: '/events' },
  { name: 'Team', path: '/team' },
  { name: 'Members', path: '/members' },
  { name: 'Verticals', path: '/verticals' },
];

function ThemeButton({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all focus:outline-none"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function Navbar({ theme, toggleTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/iiitu-acm.jpeg" alt="IIITU ACM" className="w-7 h-7 rounded-lg object-cover" />
            <span className="text-sm font-bold text-text-primary">IIITU ACM</span>
            <span className="text-xs text-text-secondary hidden sm:inline">Student Chapter</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path);
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                    active ? 'text-acm-blue bg-acm-blue/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  {l.name}
                </Link>
              );
            })}
            <div className="w-px h-4 bg-border-color mx-2" />
            {user ? (
              <>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-acm-blue bg-acm-blue/10 hover:bg-acm-blue/20 transition-all"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </button>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-text-secondary hover:text-text-primary transition-all"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-acm-blue hover:bg-acm-dark transition-all"
              >
                Sign in
              </Link>
            )}
            <ThemeButton theme={theme} toggleTheme={toggleTheme} />
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeButton theme={theme} toggleTheme={toggleTheme} />
            <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg text-text-secondary" aria-label="Menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border-color bg-bg-secondary/95 backdrop-blur-xl px-6 py-3 space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            >
              {l.name}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-acm-blue">
                Dashboard
              </Link>
              <button
                onClick={() => { logout(); setOpen(false); navigate('/'); }}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-acm-blue">
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return <SiteFooter />;
}
