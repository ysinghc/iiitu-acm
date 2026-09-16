import React from 'react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { roleLabel, cap } from '../utils/roles';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { Page, Empty, Spinner, TextInput } from '../components/ui';

export default function Members() {
  const [members, setMembers] = React.useState([]);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    fetch(`${API}/v1/users/directory`)
      .then((r) => r.json())
      .then((d) => { setMembers(d.members || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);
  useFocusRefresh(load);

  const t = q.toLowerCase();
  const filtered = members.filter((m) =>
    m.name?.toLowerCase().includes(t) ||
    m.userId?.toLowerCase().includes(t) ||
    m.batch?.toLowerCase().includes(t) ||
    (m.interestGroup?.name || '').toLowerCase().includes(t)
  );

  if (loading) return <Spinner label="Loading members…" />;

  return (
    <Page
      title="Member Directory"
      subtitle="Scholars, fellows and members — every entry is a chapter account."
      action={
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, batch…" className="!w-56" />
      }
    >
      {filtered.length === 0 ? (
        <Empty title="Nobody here yet" hint={members.length === 0 ? 'Accounts appear here once created.' : `No results for "${q}".`} />
      ) : (
        <div className="bg-card-bg border border-border-color rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-bg-elevated border-b border-border-color">
            <div className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Name</div>
            <div className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Position</div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Batch</div>
            <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary hidden md:block">Member ID</div>
          </div>
          {filtered.map((m) => (
            <div key={m._id} className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center border-b border-border-subtle last:border-0 hover:bg-bg-elevated transition-colors">
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                {m.avatarUrl ? (
                  <img src={resolveImg(m.avatarUrl)} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-border-color flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-acm-blue to-acm-dark flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[11px] font-bold">{m.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{m.name}</p>
                  {m.interestGroup?.name && <p className="text-[11px] text-text-tertiary truncate">{m.interestGroup.name}</p>}
                </div>
              </div>
              <div className="col-span-3 text-[12px] text-text-secondary">
                {roleLabel(m.role)}{m.department ? ` · ${cap(m.department)}` : ''}
              </div>
              <div className="col-span-2">
                <span className="inline-block px-2 py-0.5 bg-acm-blue/10 text-acm-blue text-[11px] font-semibold rounded-md">
                  {m.batch || '—'}
                </span>
              </div>
              <div className="col-span-2 hidden md:block">
                <span className="text-[11px] font-mono font-bold text-acm-blue">{m.userId}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {members.length > 0 && (
        <p className="mt-4 text-[11px] text-text-tertiary text-right">
          Showing {filtered.length} of {members.length} members
        </p>
      )}
    </Page>
  );
}
