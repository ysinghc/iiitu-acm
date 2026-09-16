import React from 'react';
import { api } from '../../utils/api';
import { Card, SectionTitle, Badge, Empty, Spinner } from '../ui';

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <SectionTitle hint="Live chapter metrics">Chapter at a glance</SectionTitle>
        {!stats ? (
          <Spinner label="Loading stats…" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Events', stats.counts?.totalEvents ?? 0, `${stats.counts?.upcomingEvents ?? 0} upcoming`],
              ['Board', stats.counts?.totalTeamMembers ?? 0, `${stats.counts?.igLeads ?? 0} group leads`],
              ['Members', stats.counts?.totalMembers ?? 0, 'Active roster'],
              ['Groups', stats.counts?.totalInterestGroups ?? 0, `${stats.counts?.totalDepartments ?? 0} departments`],
            ].map(([label, count, sub]) => (
              <div key={label} className="p-4 rounded-xl bg-bg-primary border border-border-color">
                <p className="text-2xl font-extrabold text-text-primary">{count}</p>
                <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mt-0.5">{label}</p>
                <p className="text-[11px] text-text-tertiary">{sub}</p>
              </div>
            ))}
          </div>
        )}
        {stats?.alerts?.length > 0 && (
          <div className="mt-4 space-y-2">
            {stats.alerts.slice(0, 3).map((a) => (
              <p key={a.id} className="text-xs text-text-secondary">• {a.title}</p>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle hint={unread ? `${unread} unread` : 'All caught up'}>Notifications</SectionTitle>
          {unread > 0 && (
            <button onClick={markAll} className="text-[11px] font-bold text-acm-blue hover:underline">
              Mark all read
            </button>
          )}
        </div>
        {notes.length === 0 ? (
          <Empty title="No notifications" hint="Workflow updates arrive here and by email." />
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <button
                key={n._id}
                onClick={() => markOne(n._id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  n.readAt ? 'border-border-color bg-bg-primary' : 'border-acm-blue/30 bg-acm-blue/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-text-primary truncate">{n.title}</p>
                  {!n.readAt && <Badge color="blue">new</Badge>}
                </div>
                {n.body && <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-[10px] text-text-tertiary mt-1">
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

