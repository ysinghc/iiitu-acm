import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { roleLabel, cap } from '../utils/roles';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { SiteHeader, SiteBody, Empty, Spinner } from '../components/ui';

function PersonCard({ person, position }) {
  const photo = person.avatarUrl ? resolveImg(person.avatarUrl) : '';
  return (
    <div className="group bg-card-bg border border-border-color rounded-2xl flex flex-col items-center text-center p-7 gap-3 card-hover animate-fade-up h-full">
      <div className="w-24 h-24 rounded-2xl bg-bg-elevated border border-border-color overflow-hidden flex items-center justify-center flex-shrink-0">
        {photo ? (
          <img src={photo} alt={person.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-acm-blue to-acm-dark">
            <span className="text-white font-bold text-2xl">{person.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-base font-bold text-text-primary tracking-tight group-hover:text-acm-blue transition-colors">{person.name}</h3>
        <p className="acm-tag mt-1">{position}</p>
        {person.department && (
          <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">{person.department}</p>
        )}
      </div>
      {(person.github || person.linkedin) && (
        <div className="flex gap-4 mt-auto pt-4 border-t border-border-subtle w-full justify-center">
          {person.github && (
            <a href={person.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary">
              GitHub <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {person.linkedin && (
            <a href={person.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-acm-blue">
              LinkedIn <ArrowUpRight className="h-3 w-3" />
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
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-acm-blue">{kicker}</span>
        <h2 className="text-2xl font-bold text-text-primary mt-1 tracking-tight">{title}</h2>
        <p className="text-xs text-text-secondary mt-1 max-w-xl">{hint}</p>
      </div>
      {people.length === 0 ? (
        <Empty title="Nobody here yet" hint="Accounts with this position appear automatically." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
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

  return (
    <div className="flex-1 flex flex-col bg-bg-primary transition-colors duration-300">
      <SiteHeader
        kicker="Team"
        title="Leadership & Executive Board"
        desc="Everyone shown here holds a chapter account — positions update automatically."
      />
      <SiteBody>
        {loading ? (
          <Spinner label="Loading team…" />
        ) : (
          <div className="space-y-16">
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
        )}
      </SiteBody>
    </div>
  );
}
