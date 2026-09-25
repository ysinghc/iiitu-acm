import React from 'react';
import { CalendarDays, Crown, Users, FolderKanban, Bell, CheckCheck } from 'lucide-react';
import { api } from '../../utils/api';
import { Card, SectionTitle, Badge, Empty, Spinner } from '../ui';

const STATS = [
  { key: 'events', label: 'Events', icon: CalendarDays, count: (c) => c?.totalEvents ?? 0, sub: (c) => `${c?.upcomingEvents ?? 0} upcoming` },
  { key: 'board', label: 'Board', icon: Crown, count: (c) => c?.totalTeamMembers ?? 0, sub: (c) => `${c?.igLeads ?? 0} group leads` },
  { key: 'members', label: 'Members', icon: Users, count: (c) => c?.totalMembers ?? 0, sub: () => 'Active roster' },
  { key: 'groups', label: 'Groups', icon: FolderKanban, count: (c) => c?.totalInterestGroups ?? 0, sub: (c) => `${c?.totalDepartments ?? 0} departments` },
];

export default function OverviewSection() {
  const [stats, setStats] = React.useState(null);
  const [notes, setNotes] = React.useState([]);
  const [unread, setUnread] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const s = await api.get('/admin/stats');
      setStats(s);
    } catch { /* stats are a bonus, not a blocker */ }
    try {
      const n = await api.get('/v1/notifications?limit=8');
      setNotes(n.items || []);
      setUnread(n.unread || 0);
    } catch { /* inbox optional */ }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    await api.post('/v1/notifications/read-all');
    load();
  };

  const markOne = async (id) => {
    await api.patch(`/v1/notifications/${id}/read`);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Stat tiles — full-width spread */}
      {!stats ? (
        <Card><Spinner label="Loading stats…" /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.key} className="!p-5 card-hover">
                  <div className="w-10 h-10 rounded-xl bg-acm-blue/10 flex items-center justify-center text-acm-blue">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 text-3xl font-extrabold tracking-tight text-text-primary">{s.count(stats.counts)}</p>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-1">{s.label}</p>
                  <p className="text-[11px] text-text-tertiary">{s.sub(stats.counts)}</p>
                </Card>
              );
            })}
          </div>
          {stats?.alerts?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stats.alerts.slice(0, 3).map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  • {a.title}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Inbox — spread across the width */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle hint={unread ? `${unread} unread` : 'All caught up'}>
            <span className="inline-flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</span>
          </SectionTitle>
          {unread > 0 && (
            <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] font-bold text-acm-blue hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        {notes.length === 0 ? (
          <Empty title="No notifications" hint="Workflow updates arrive here and by email." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((n) => (
              <button
                key={n._id}
                onClick={() => markOne(n._id)}
                className={`text-left p-4 rounded-2xl border transition-all card-hover ${
                  n.readAt ? 'border-border-color bg-bg-primary' : 'border-acm-blue/30 bg-acm-blue/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-text-primary truncate">{n.title}</p>
                  {!n.readAt && <Badge color="blue">new</Badge>}
                </div>
                {n.body && <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">{n.body}</p>}
                <p className="text-[10px] text-text-tertiary mt-2">
                  {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
