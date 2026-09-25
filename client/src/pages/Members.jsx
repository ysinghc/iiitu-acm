import React from 'react';
import { Search } from 'lucide-react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { roleLabel, cap } from '../utils/roles';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { SiteHeader, SiteBody, Empty, Spinner, TextInput } from '../components/ui';

function MemberCard({ m }) {
  return (
    <div className="group bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col gap-3 card-hover h-full">
      <div className="flex items-center gap-3">
        {m.avatarUrl ? (
          <img src={resolveImg(m.avatarUrl)} alt={m.name} className="w-12 h-12 rounded-xl object-cover border border-border-color flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-acm-blue to-acm-dark flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base font-bold">{m.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary truncate group-hover:text-acm-blue transition-colors">{m.name}</p>
          <p className="text-[11px] text-text-secondary truncate">
            {roleLabel(m.role)}{m.department ? ` · ${cap(m.department)}` : ''}
          </p>
        </div>
      </div>
      {m.interestGroup?.name && (
        <p className="text-xs text-text-tertiary truncate">{m.interestGroup.name}</p>
      )}
      <div className="mt-auto pt-4 border-t border-border-subtle flex items-center gap-2">
        <span className="inline-block px-2 py-0.5 bg-acm-blue/10 text-acm-blue text-[11px] font-semibold rounded-md">
          {m.batch || '—'}
        </span>
        <span className="text-[11px] font-mono font-bold text-acm-blue ml-auto">{m.userId}</span>
      </div>
    </div>
  );
}

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

  return (
    <div className="flex-1 flex flex-col bg-bg-primary transition-colors duration-300">
      <SiteHeader
        kicker="Community"
        title="Member Directory"
        desc="Scholars, fellows and members — every entry is a chapter account."
        action={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, batch…" className="!w-64 !pl-9" />
          </div>
        }
      >
        {members.length > 0 && (
          <p className="mt-4 text-[11px] text-text-tertiary">
            Showing {filtered.length} of {members.length} members
          </p>
        )}
      </SiteHeader>

      <SiteBody>
        {loading ? (
          <Spinner label="Loading members…" />
        ) : filtered.length === 0 ? (
          <Empty title="Nobody here yet" hint={members.length === 0 ? 'Accounts appear here once created.' : `No results for "${q}".`} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
            {filtered.map((m) => (
              <MemberCard key={m._id} m={m} />
            ))}
          </div>
        )}
      </SiteBody>
    </div>
  );
}
