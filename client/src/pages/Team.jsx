import React from 'react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { roleLabel, cap } from '../utils/roles';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { Page, Empty, Spinner } from '../components/ui';

function PersonCard({ person, position }) {
  const photo = person.avatarUrl ? resolveImg(person.avatarUrl) : '';
  return (
    <div className="bg-card-bg border border-border-color rounded-2xl flex flex-col items-center text-center p-6 gap-3 card-hover animate-fade-up">
      <div className="w-20 h-20 rounded-full bg-bg-elevated border-2 border-border-color overflow-hidden flex items-center justify-center">
        {photo ? (
          <img src={photo} alt={person.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-acm-blue to-acm-dark">
            <span className="text-white font-bold text-xl">{person.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{person.name}</h3>
        <p className="acm-tag mt-1">{position}</p>
        {person.department && (
          <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">{person.department}</p>
        )}
      </div>
      {(person.github || person.linkedin) && (
        <div className="flex gap-4 mt-auto pt-3 border-t border-border-color w-full justify-center">
          {person.github && (
            <a href={person.github} target="_blank" rel="noreferrer" className="text-xs font-semibold text-text-secondary hover:text-text-primary">
              GitHub
            </a>
          )}
          {person.linkedin && (
            <a href={person.linkedin} target="_blank" rel="noreferrer" className="text-xs font-semibold text-text-secondary hover:text-acm-blue">
              LinkedIn
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ kicker, title, hint, people, positionOf }) {
  return (
    <div>
      <div className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-acm-blue">{kicker}</span>
        <h2 className="text-xl md:text-2xl font-bold text-text-primary mt-1">{title}</h2>
        <p className="text-xs text-text-secondary mt-1">{hint}</p>
      </div>
      {people.length === 0 ? (
        <Empty title="Nobody here yet" hint="Accounts with this position appear automatically." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {people.map((p) => (
            <PersonCard key={p._id} person={p} position={positionOf(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Team() {
  const [dir, setDir] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    fetch(`${API}/v1/users/directory`)
      .then((r) => r.json())
      .then((d) => { setDir(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);
  useFocusRefresh(load);

  if (loading) return <Spinner label="Loading team…" />;

  return (
    <Page
      title="Leadership & Executive Board"
      subtitle="Everyone shown here holds a chapter account — positions update automatically."
    >
      <div className="space-y-14">
        <Section
          kicker="ACM chartered roles"
          title="Executive Board"
          hint="Chair, Vice Chair, Secretary and Treasurer."
          people={dir?.exec || []}
          positionOf={(p) => roleLabel(p.role)}
        />
        <Section
          kicker="Chapter governance"
          title="Heads of Department"
          hint="Faculty heads of the Engineering and Research departments."
          people={dir?.hod || []}
          positionOf={(p) => `Head of Department${p.department ? ` · ${cap(p.department)}` : ''}`}
        />
        <Section
          kicker="Domain leads"
          title="Experts"
          hint="Expert mentors guiding verticals, scholars and fellows."
          people={dir?.experts || []}
          positionOf={(p) => (p.leads ? `Expert · ${p.leads}` : `Expert${p.department ? ` · ${cap(p.department)}` : ''}`)}
        />
      </div>
    </Page>
  );
}
