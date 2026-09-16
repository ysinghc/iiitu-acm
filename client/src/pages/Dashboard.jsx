import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, User, Calendar, TrendingUp, Users, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Page, Spinner } from '../components/ui';
import { roleLabel, cap } from '../utils/roles';
import OverviewSection from '../components/dashboard/OverviewSection';
import ProfileSection from '../components/dashboard/ProfileSection';
import EventsSection from '../components/dashboard/EventsSection';
import ProgressSection from '../components/dashboard/ProgressSection';
import PeopleSection from '../components/dashboard/PeopleSection';
import ContentSection from '../components/dashboard/ContentSection';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: null },
  { id: 'profile', label: 'Profile', icon: User, roles: null },
  { id: 'events', label: 'Events', icon: Calendar, roles: null },
  { id: 'progress', label: 'Progress', icon: TrendingUp, roles: null },
  { id: 'people', label: 'People', icon: Users, roles: null },
  { id: 'content', label: 'Site content', icon: Globe, roles: ['chair', 'vice_chair', 'secretary', 'treasurer', 'hod', 'expert'] },
];

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  React.useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user, navigate]);

  if (loading || !user) return <Spinner label="Loading dashboard…" />;

  const visible = TABS.filter((t) => !t.roles || t.roles.includes(user.role));
  const active = visible.some((t) => t.id === tab) ? tab : 'overview';

  return (
    <Page
      title={`${greet(user)}${user.name?.split(' ')[0] || ''}`}
      subtitle={`${roleLabel(user.role)}${user.department ? ` · ${cap(user.department)}` : ''}`}
    >
      <div className="flex gap-1.5 flex-wrap mb-6 p-1 rounded-2xl bg-bg-secondary border border-border-color w-fit max-w-full">
        {visible.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setParams({ tab: t.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                on ? 'bg-acm-blue text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {active === 'overview' && <OverviewSection />}
      {active === 'profile' && <ProfileSection />}
      {active === 'events' && <EventsSection />}
      {active === 'progress' && <ProgressSection />}
      {active === 'people' && <PeopleSection />}
      {active === 'content' && <ContentSection />}
    </Page>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, ';
  if (h < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}
