import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  LayoutDashboard, User, Calendar, TrendingUp, Users, Globe,
  LogOut, Menu, X, ChevronRight, Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Spinner, Badge } from '../components/ui';
import { roleLabel, cap } from '../utils/roles';
import OverviewSection from '../components/dashboard/OverviewSection';
import ProfileSection from '../components/dashboard/ProfileSection';
import EventsSection from '../components/dashboard/EventsSection';
import ProgressSection from '../components/dashboard/ProgressSection';
import PeopleSection from '../components/dashboard/PeopleSection';
import ContentSection from '../components/dashboard/ContentSection';

const EXEC = ['chair', 'vice_chair', 'secretary', 'treasurer'];
const MANAGERS = [...EXEC, 'hod'];
const STAFF = [...MANAGERS, 'expert'];
const EVERYONE = [...STAFF, 'scholar', 'fellow', 'member'];

// Every tab carries an explicit RBAC allowlist plus a one-line description
// so users always know what lives where.
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: EVERYONE, desc: 'Chapter health, alerts and your inbox at a glance.' },
  { id: 'events', label: 'Events', icon: Calendar, roles: EVERYONE, desc: 'Propose events, track yours, and review the queue.' },
  { id: 'progress', label: 'Progress', icon: TrendingUp, roles: EVERYONE, desc: 'Monthly reports, summaries and the approval chain.' },
  { id: 'people', label: 'People', icon: Users, roles: EVERYONE, desc: 'Directory, invites and member management.' },
  { id: 'content', label: 'Site content', icon: Globe, roles: STAFF, desc: 'Homepage, verticals and leadership messages.' },
  { id: 'profile', label: 'Profile', icon: User, roles: EVERYONE, desc: 'Your public profile, avatar and password.' },
];

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [drawer, setDrawer] = React.useState(false);
  const tab = params.get('tab') || 'overview';

  React.useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  // Lock body scroll when the mobile drawer is open.
  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  const visible = TABS.filter((t) => t.roles.includes(user.role));
  const activeTab = visible.some((t) => t.id === tab) ? visible.find((t) => t.id === tab) : visible[0];

  const go = (id) => {
    setParams(id === 'overview' ? {} : { tab: id });
    setDrawer(false);
  };
  const signOut = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex animate-fade-up">
      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-border-color bg-bg-secondary h-screen sticky top-0">
        <SidebarBody user={user} visible={visible} activeId={activeTab.id} go={go} signOut={signOut} />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-bg-secondary border-r border-border-color flex flex-col shadow-2xl">
            <div className="flex items-center justify-end px-4 pt-3">
              <button onClick={() => setDrawer(false)} aria-label="Close menu"
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <SidebarBody user={user} visible={visible} activeId={activeTab.id} go={go} signOut={signOut} />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main column ───────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-bg-primary/90 backdrop-blur border-b border-border-subtle">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-10 h-16">
            <button onClick={() => setDrawer(true)} aria-label="Open menu"
              className="lg:hidden p-2 -ml-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all">
              <Menu className="h-5 w-5" />
            </button>
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-tertiary min-w-0">
              <Link to="/" className="hover:text-acm-blue transition-colors flex items-center gap-1 shrink-0">
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Site</span>
              </Link>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span>Dashboard</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="text-text-primary font-semibold truncate">{activeTab.label}</span>
            </nav>
            <div className="flex-1" />
            {/* User chip */}
            <button onClick={() => go('profile')}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full border border-border-color bg-bg-secondary hover:border-acm-blue/40 transition-all"
              title="Open your profile">
              <span className="w-7 h-7 rounded-full bg-acm-blue text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                {initials(user.name)}
              </span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-xs font-bold truncate max-w-32">{user.name?.split(' ')[0]}</span>
                <span className="block text-[10px] text-text-tertiary">{roleLabel(user.role)}</span>
              </span>
            </button>
          </div>
        </header>

        {/* Page heading */}
        <div className="px-4 sm:px-6 lg:px-10 pt-6 md:pt-8 pb-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="acm-tag mb-1">{greet()}{user.name?.split(' ')[0] || 'there'}</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{activeTab.label}</h1>
              <p className="mt-1 text-sm text-text-secondary max-w-2xl">{activeTab.desc}</p>
            </div>
            <Badge color="blue">{roleLabel(user.role)}{user.department ? ` · ${cap(user.department)}` : ''}</Badge>
          </div>
          {/* Mobile quick-nav: horizontal pills, full-bleed scroll */}
          <nav aria-label="Dashboard sections" className="lg:hidden flex gap-1.5 overflow-x-auto mt-4 -mx-4 px-4 pb-1">
            {visible.map((t) => {
              const Icon = t.icon;
              const on = activeTab.id === t.id;
              return (
                <button key={t.id} onClick={() => go(t.id)} aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    on ? 'bg-acm-blue text-white border-acm-blue shadow-sm'
                       : 'bg-bg-secondary text-text-secondary border-border-color hover:text-text-primary'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content — full width of the viewport */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-4 md:py-6">
          <div key={activeTab.id} className="animate-fade-up">
            {activeTab.id === 'overview' && <OverviewSection />}
            {activeTab.id === 'profile' && <ProfileSection />}
            {activeTab.id === 'events' && <EventsSection />}
            {activeTab.id === 'progress' && <ProgressSection />}
            {activeTab.id === 'people' && <PeopleSection />}
            {activeTab.id === 'content' && <ContentSection />}
          </div>
          <footer className="mt-10 pb-6 text-center text-[11px] text-text-tertiary">
            IIITU ACM member portal · signed in as {user.email}
          </footer>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ user, visible, activeId, go, signOut }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 px-5 pt-5 pb-4 shrink-0">
        <img src="/iiitu-acm.jpeg" alt="IIITU ACM" className="w-9 h-9 rounded-xl object-cover" />
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight">IIITU ACM</span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Member portal</span>
        </span>
      </Link>

      {/* User card */}
      <div className="mx-3 mb-3 p-3 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center gap-3 shrink-0">
        <span className="w-10 h-10 rounded-full bg-acm-blue text-white text-sm font-bold flex items-center justify-center shrink-0">
          {initials(user.name)}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold truncate">{user.name}</span>
          <span className="block text-[10px] text-text-secondary truncate">{roleLabel(user.role)}{user.department ? ` · ${cap(user.department)}` : ''}</span>
        </span>
      </div>

      {/* Nav */}
      <nav aria-label="Dashboard sections" className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1">
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Workspace</p>
        {visible.map((t) => {
          const Icon = t.icon;
          const on = activeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              aria-current={on ? 'page' : undefined}
              title={t.desc}
              className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all focus-visible:outline-2 focus-visible:outline-acm-blue ${
                on ? 'bg-acm-blue text-white shadow-sm'
                   : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${on ? '' : 'text-text-tertiary group-hover:text-acm-blue'} transition-colors`} />
              <span className="flex-1 truncate">{t.label}</span>
              {on && <span className="h-1.5 w-1.5 rounded-full bg-white/90 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t border-border-subtle space-y-1 shrink-0">
        <Link to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all">
          <Home className="h-4 w-4 shrink-0" />
          Back to site
        </Link>
        <button onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all text-left">
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, ';
  if (h < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}
