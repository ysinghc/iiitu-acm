import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Code2, FlaskConical, ExternalLink, BookOpen, Users, ChevronLeft, Link2 } from 'lucide-react';
import { API } from '../../utils/apiURL';

const deptMeta = {
  engineering: {
    Icon: Code2,
    color: 'from-blue-600 to-indigo-700',
    accent: 'text-blue-500',
    accentBg: 'bg-blue-50 dark:bg-blue-500/10',
    accentBorder: 'border-blue-200 dark:border-blue-500/20',
  },
  research: {
    Icon: FlaskConical,
    color: 'from-violet-600 to-purple-700',
    accent: 'text-violet-600',
    accentBg: 'bg-violet-50 dark:bg-violet-500/10',
    accentBorder: 'border-violet-200 dark:border-violet-500/20',
  },
};

function MemberAvatar({ member }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center w-16">
      <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border-color overflow-hidden flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-text-tertiary">
          {member.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <span className="text-[10px] text-text-secondary leading-tight line-clamp-2">{member.name}</span>
    </div>
  );
}

function IglCard({ igl, accentClass }) {
  if (!igl) return null;
  return (
    <div className="flex items-center gap-3 bg-bg-primary border border-border-color rounded-xl p-3">
      <div className="w-10 h-10 rounded-full border-2 border-border-color overflow-hidden flex-shrink-0 bg-bg-elevated">
        {igl.imageUrl ? (
          <img src={igl.imageUrl} alt={igl.name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm font-bold text-text-tertiary">{igl.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">{igl.name}</p>
        <p className={`text-[10px] font-semibold ${accentClass}`}>Interest Group Lead</p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {igl.github && (
          <a href={igl.github} target="_blank" rel="noopener noreferrer"
            className="text-text-tertiary hover:text-text-primary transition-colors" title="GitHub">
            <Link2 className="h-3.5 w-3.5" />
          </a>
        )}
        {igl.linkedin && (
          <a href={igl.linkedin} target="_blank" rel="noopener noreferrer"
            className="text-text-tertiary hover:text-acm-blue transition-colors" title="LinkedIn">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {igl.research && (
          <a href={igl.research} target="_blank" rel="noopener noreferrer"
            className="text-text-tertiary hover:text-acm-blue transition-colors" title="Research">
            <BookOpen className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function InterestGroupCard({ group, meta, index }) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    fetch(`${API}/public/interest-groups/${group._id}/members`)
      .then(r => r.json())
      .then(data => {
        setMembers(Array.isArray(data) ? data : []);
        setLoadingMembers(false);
      })
      .catch(() => setLoadingMembers(false));
  }, [group._id]);

  return (
    <div
      className="bg-card-bg border border-border-color rounded-2xl overflow-hidden card-hover animate-fade-up"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both', opacity: 0 }}
    >
      {/* Group Header */}
      <div className={`px-6 pt-6 pb-4 border-b border-border-color`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-text-primary leading-snug">{group.name}</h3>
            {group.areaOfInterest && (
              <span className={`text-[10px] font-semibold tracking-wider uppercase ${meta.accent} mt-0.5 block`}>
                {group.areaOfInterest}
              </span>
            )}
          </div>
         
        </div>
        {group.description && (
          <p className="text-xs text-text-secondary leading-relaxed">{group.description}</p>
        )}
      </div>

      {/* IGL */}
      {group.igl && (
        <div className="px-6 py-4 border-b border-border-color">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2">Group Lead</p>
          <IglCard igl={group.igl} accentClass={meta.accent} />
        </div>
      )}

      {/* Members */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Members</p>
          {!loadingMembers && (
            <span className="text-[10px] text-text-tertiary font-medium">{members.length} enrolled</span>
          )}
        </div>
        {loadingMembers ? (
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-text-tertiary italic">No members enrolled yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map(m => <MemberAvatar key={m._id} member={m} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DepartmentPage() {
  const { slug } = useParams();
  const [department, setDepartment] = useState(null);
  const [interestGroups, setInterestGroups] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const meta = deptMeta[slug] || deptMeta.engineering;

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/public/departments/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(({ department, interestGroups }) => {
        setDepartment(department);
        setInterestGroups(interestGroups);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-acm-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-text-secondary">Loading department…</p>
        </div>
      </div>
    );
  }

  if (notFound || !department) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-bg-primary gap-4">
        <p className="text-text-primary font-semibold">Department not found.</p>
        <Link to="/verticals" className="text-sm text-acm-blue hover:underline">
          ← Back to Verticals
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen transition-colors duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        {department.bannerImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${department.bannerImageUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative max-w-6xl mx-auto px-8 py-20">
          <Link to="/verticals" className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors mb-6">
            <ChevronLeft className="h-3.5 w-3.5" />
            All Departments
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center flex-shrink-0`}>
              <meta.Icon className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">{department.name}</h1>
            </div>
          </div>
          {department.description && (
            <p className="text-white/70 text-sm max-w-2xl leading-relaxed">{department.description}</p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-bg-secondary border-b border-border-color">
        <div className="max-w-6xl mx-auto px-8 py-5 flex flex-wrap gap-8">
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">{interestGroups.length}</p>
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider">Interest Groups</p>
          </div>
          <div className="w-px bg-border-color hidden sm:block" />
          <div className="text-center">
            <p className="text-xl font-bold text-text-primary">{interestGroups.filter(g => g.igl).length}</p>
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider">Group Leads</p>
          </div>
          {department.mission && (
            <>
              <div className="w-px bg-border-color hidden sm:block" />
              <div className="flex items-center max-w-sm">
                <p className="text-xs text-text-secondary leading-relaxed italic">{department.mission}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Interest Groups */}
      <div className="max-w-6xl mx-auto px-8 py-14">
        <div className="mb-10">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${meta.accent}`}>Verticals</span>
          <h2 className="text-2xl font-bold text-text-primary mt-1">Interest Groups</h2>
          <p className="text-xs text-text-secondary mt-1">
            Each vertical is a focused community with an Interest Group Lead guiding projects, study sessions, and collaborative work.
          </p>
        </div>

        {interestGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-border-color rounded-2xl bg-card-bg text-center gap-3">
            <Users className="h-10 w-10 text-text-tertiary" strokeWidth={1} />
            <p className="text-text-secondary text-sm">No interest groups set up yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {interestGroups.map((group, i) => (
              <InterestGroupCard key={group._id} group={group} meta={meta} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
