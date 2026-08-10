import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { API } from '../utils/apiURL';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/members`)
      .then(r => r.json())
      .then(d => {
        const sorted = [...d].sort((a, b) => a.name.localeCompare(b.name));
        setMembers(sorted);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = members.filter(m => {
    const t = searchTerm.toLowerCase();
    return (
      m.name?.toLowerCase().includes(t) ||
      m.role?.toLowerCase().includes(t) ||
      m.batch?.toLowerCase().includes(t) ||
      m.email?.toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-acm-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-text-secondary">Loading members…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen transition-colors duration-300">
      {/* Page Header */}
      <div className="bg-bg-secondary border-b border-border-color">
        <div className="max-w-6xl mx-auto px-8 py-14">
          <span className="acm-tag">Chapter Roster</span>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Member Directory
          </h1>
          <p className="mt-3 text-text-secondary text-sm max-w-lg leading-relaxed">
            A complete directory of all registered students in the IIITU ACM Student Chapter.
          </p>

          {/* Search bar */}
          <div className="mt-6 relative max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-3.5 w-3.5 text-text-tertiary" />
            </span>
            <input
              type="text"
              placeholder="Search by name, batch, or role…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-color bg-bg-primary text-text-primary placeholder:text-text-tertiary text-[13px] focus:outline-none focus:ring-2 focus:ring-acm-blue/30 focus:border-acm-blue transition-all duration-200"
            />
            {searchTerm && (
              <span className="absolute inset-y-0 right-3 flex items-center text-[11px] text-text-tertiary font-medium">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-border-color rounded-2xl bg-card-bg text-center gap-3">
            <div className="text-4xl">🔍</div>
            <p className="text-text-secondary text-sm">
              {members.length === 0 ? 'No members have been added yet.' : `No results for "${searchTerm}"`}
            </p>
          </div>
        ) : (
          <div className="bg-card-bg border border-border-color rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-bg-elevated border-b border-border-color">
              <div className="col-span-5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Name</div>
              <div className="col-span-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Designation</div>
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Batch</div>
              <div className="col-span-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary hidden md:block">Email</div>
            </div>

            {/* Rows */}
            {filtered.map((member, idx) => (
              <div
                key={member._id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-border-subtle last:border-0 hover:bg-bg-elevated transition-colors duration-150 animate-fade-up`}
                style={{ animationDelay: `${Math.min(idx, 15) * 0.03}s`, animationFillMode: 'both', opacity: 0 }}
              >
                {/* Name + Avatar */}
                <div className="col-span-5 flex items-center gap-3">
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="w-8 h-8 rounded-full object-cover border border-border-color flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-acm-blue to-acm-dark flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-[13px] font-semibold text-text-primary truncate">{member.name}</span>
                </div>

                {/* Role */}
                <div className="col-span-3">
                  <span className="text-[12px] text-text-secondary">{member.role || 'Member'}</span>
                </div>

                {/* Batch */}
                <div className="col-span-2">
                  <span className="inline-block px-2 py-0.5 bg-acm-blue/10 text-acm-blue text-[11px] font-semibold rounded-md">
                    {member.batch}
                  </span>
                </div>

                {/* Email */}
                <div className="col-span-2 hidden md:block">
                  <span className="text-[11px] text-text-tertiary font-mono truncate block">{member.email || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {members.length > 0 && (
          <p className="mt-4 text-[11px] text-text-tertiary text-right">
            Showing {filtered.length} of {members.length} members
          </p>
        )}
      </div>
    </div>
  );
}
