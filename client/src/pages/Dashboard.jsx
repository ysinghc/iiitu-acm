import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, TrendingUp, Users, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page, Spinner } from '../components/ui';
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

// Every tab carries an explicit RBAC allowlist. `roles: null` is not used —
// open tabs list all roles so access policy stays visible in one place.
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: EVERYONE },
  { id: 'profile', label: 'Profile', icon: User, roles: EVERYONE },
  { id: 'events', label: 'Events', icon: Calendar, roles: EVERYONE },
  { id: 'progress', label: 'Progress', icon: TrendingUp, roles: EVERYONE },
  { id: 'people', label: 'People', icon: Users, roles: EVERYONE, hint: 'Directory for all · invites managed by role' },
  { id: 'content', label: 'Site content', icon: Globe, roles: STAFF },
];

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  React.useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  if (loading || !user) return <Spinner label="Loading dashboard…" />;

  const visible = TABS.filter((t) => t.roles.includes(user.role));
  const active = visible.some((t) => t.id === tab) ? tab : 'overview';

  const go = (id) => setParams({ tab: id });

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 md:py-10 animate-fade-up">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Vertical sidebar — each row is a horizontal icon + label tab */}
        <aside className="md:w-60 md:shrink-0">
          <div className="md:sticky md:top-6 rounded-2xl bg-bg-secondary border border-border-color p-2">
            <div className="px-3 pt-2 pb-3">
              <p className="text-sm font-bold text-text-primary leading-tight">
                {greet()}{user.name?.split(' ')[0] || ''}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {roleLabel(user.role)}{user.department ? ` · ${cap(user.department)}` : ''}
              </p>
            </div>
            <nav aria-label="Dashboard sections" className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
              {visible.map((t) => {
                const Icon = t.icon;
                const on = active === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => go(t.id)}
                    aria-current={on ? 'page' : undefined}
                    title={t.hint || t.label}
                    className={`flex flex-row items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-left w-auto md:w-full ${
                      on ? 'bg-acm-blue text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{t.label}</span>
                    {on && <span className="hidden md:block h-1.5 w-1.5 rounded-full bg-white/80" />}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="mt-2 hidden md:flex flex-row items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-all w-full text-left"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Content pane */}
        <main className="flex-1 min-w-0">
          <Page
            title={TABS.find((t) => t.id === active)?.label || 'Overview'}
            subtitle={`${roleLabel(user.role)}${user.department ? ` · ${cap(user.department)}` : ''}`}
          >
            {active === 'overview' && <OverviewSection />}
            {active === 'profile' && <ProfileSection />}
            {active === 'events' && <EventsSection />}
            {active === 'progress' && <ProgressSection />}
            {active === 'people' && <PeopleSection />}
            {active === 'content' && <ContentSection />}
          </Page>
        </main>
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
