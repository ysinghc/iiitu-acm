import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bg-secondary border-t border-border-color transition-colors duration-300 mt-auto">
      <div className="max-w-6xl mx-auto px-8">
        {/* Main Footer Grid */}
        <div className="py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img 
                src="/iiitu-acm.jpeg" 
                alt="IIITU ACM Logo" 
                className="w-6 h-6 rounded-md object-cover" 
              />
              <div>
                <p className="text-sm font-bold text-text-primary tracking-tight">IIITU ACM</p>
                <p className="text-[11px] text-text-secondary">Student Chapter</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed max-w-xs">
              Empowering student developers, researchers, and leaders through computing excellence at IIIT Una.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', to: '/' },
                { label: 'Executive Team', to: '/team' },
                { label: 'Member Directory', to: '/members' },
                { label: 'Departments & Verticals', to: '/departments' },
                { label: 'Chapter Bylaws', href: '/document.pdf' },
              ].map(item => (
                <li key={item.label}>
                  {item.to ? (
                    <Link to={item.to} className="text-xs text-text-secondary hover:text-acm-blue transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-acm-blue transition-colors">
                      {item.label} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Institute & ACM */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-4">Institute</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Indian Institute of Information Technology<br />
              Una, Himachal Pradesh — 177209
            </p>
            <a
              href="https://iiitu.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-xs text-acm-blue hover:underline"
            >
              iiitu.ac.in ↗
            </a>

            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3 mt-6">ACM</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://www.acm.org" target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-acm-blue transition-colors">
                  ACM Global ↗
                </a>
              </li>
              <li>
                <a href="https://india.acm.org" target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-acm-blue transition-colors">
                  ACM India ↗
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border-color py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-text-tertiary">
            © {year} IIITU ACM Student Chapter. All rights reserved.
          </p>
          <Link to="/admin/login" className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors">
            Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
