import React, { useState, useEffect } from 'react';
import { API } from '../utils/apiURL';

const GitHubIcon = () => (
  <svg className="h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const ResearchIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10" />
    <path d="M6 10h10" />
  </svg>
);

const REPO_OWNER = 'ysinghc';
const REPO_NAME = 'iiitu-acm';

function MemberCard({ member, index }) {
  return (
    <div
      className="bg-card-bg border border-border-color rounded-2xl flex flex-col items-center text-center p-6 gap-4 card-hover animate-fade-up"
      style={{ animationDelay: `${index * 0.07}s`, animationFillMode: 'both', opacity: 0 }}
    >
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-bg-elevated border-2 border-border-color overflow-hidden flex items-center justify-center">
          {member.imageUrl ? (
            <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-acm-blue to-acm-dark">
              <span className="text-white font-bold text-xl">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{member.name}</h3>
        <p className="acm-tag mt-1">{member.role}</p>
      </div>

      {(member.github || member.linkedin || member.research) && (
        <div className="flex gap-3 mt-auto pt-3 border-t border-border-color w-full justify-center">
          {member.github && (
            <a href={member.github} target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="GitHub"
            >
              <GitHubIcon />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-acm-blue transition-colors"
              title="LinkedIn"
            >
              <LinkedInIcon />
            </a>
          )}
          {member.research && (
            <a href={member.research} target="_blank" rel="noopener noreferrer"
              className="text-text-secondary hover:text-acm-blue transition-colors"
              title="Research Publications / Google Scholar"
            >
              <ResearchIcon />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function Team() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePane, setActivePane] = useState('executive'); // 'executive' | 'dev'
  const [slideDirection, setSlideDirection] = useState('right'); // 'left' | 'right'

  // GitHub Stats
  const [devContributors, setDevContributors] = useState([]);
  const [devLoading, setDevLoading] = useState(true);

  const handlePaneChange = (pane) => {
    if (pane === activePane) return;
    setSlideDirection(pane === 'dev' ? 'left' : 'right');
    setActivePane(pane);
  };

  useEffect(() => {
    // 1. Fetch Executive Board Members
    fetch(`${API}/public/team`)
      .then(r => r.json())
      .then(d => {
        const sorted = [...d].sort((a, b) => {
          const orderA = a.order ?? 99;
          const orderB = b.order ?? 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        setTeam(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // 2. Fetch Live GitHub Contributors & Merged PR Stats
    const fetchGitHubStats = async () => {
      try {
        const [contribRes, prRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contributors`),
          fetch(`https://api.github.com/search/issues?q=repo:${REPO_OWNER}/${REPO_NAME}+is:pr+is:merged`),
        ]);

        const contribData = await contribRes.json();
        const prData = await prRes.json();

        // Calculate merged PR count per GitHub handle
        const prCounts = {};
        if (prData && Array.isArray(prData.items)) {
          prData.items.forEach(item => {
            const handle = item.user?.login;
            if (handle) {
              prCounts[handle] = (prCounts[handle] || 0) + 1;
            }
          });
        }

        if (Array.isArray(contribData)) {
          const list = contribData.map(c => ({
            handle: c.login,
            url: c.html_url,
            avatarUrl: c.avatar_url,
            prs: prCounts[c.login] || 0,
          })).sort((a, b) => a.handle.localeCompare(b.handle)); // ascending order by handle

          setDevContributors(list);
        }
      } catch (err) {
        console.error('Error fetching GitHub API contributors:', err);
      } finally {
        setDevLoading(false);
      }
    };

    fetchGitHubStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-acm-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-text-secondary">Loading team…</p>
        </div>
      </div>
    );
  }

  const isInternalAffairs = (member) => {
    if (member.category === 'internal_affairs') return true;
    if (member.category && member.category !== 'internal_affairs') return false;
    const r = (member.role || '').toLowerCase();
    return r.includes('internal') || r.includes('affair') || r.includes('grievance');
  };

  const isIGL = (member) => {
    if (member.category === 'igl') return true;
    if (member.category && member.category !== 'igl') return false;
    const r = (member.role || '').toLowerCase();
    return r.startsWith('igl') || r.includes('interest group lead');
  };

  const chartered = team.filter(m => !isInternalAffairs(m) && !isIGL(m));
  const internalAffairs = team.filter(m => isInternalAffairs(m));
  const clubAppointees = team.filter(m => isIGL(m));

  return (
    <div className="bg-bg-primary min-h-screen transition-colors duration-300">
      {/* Page Header matching height with button to switch panes */}
      <div className="bg-bg-secondary border-b border-border-color">
        <div className="max-w-6xl mx-auto px-8 py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
              {activePane === 'executive' ? 'Leadership & Executive Board' : 'Leadership & Executive Board'}
            </h1>
            <p className="mt-3 text-text-secondary text-sm max-w-lg leading-relaxed">
              {activePane === 'executive'
                ? 'Our chapter governance is led by three executive roles: the Elected Board, Internal Affairs, and Interest Group Leads (IGLs).'
                : 'Core technical leadership and open-source codebase contributors powering IIITU ACM.'}
            </p>
          </div>

          {/* Switcher Partition / Buttons */}
          <div className="flex-shrink-0 self-start md:self-center">
            <div className="inline-flex p-1 bg-bg-elevated border border-border-color rounded-xl">
              <button
                onClick={() => handlePaneChange('executive')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePane === 'executive'
                    ? 'bg-acm-blue text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Leadership
              </button>
              <button
                onClick={() => handlePaneChange('dev')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activePane === 'dev'
                    ? 'bg-acm-blue text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Development Team
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container with Smooth Left / Right Slide Animations */}
      <div className="max-w-6xl mx-auto px-8 py-14">
        <div
          key={activePane}
          className={slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'}
        >
          {activePane === 'executive' ? (
            <div className="space-y-16">
              {/* 1. Elected Board */}
              <div>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-acm-blue">ACM Chartered Roles</span>
                  <h2 className="text-xl md:text-2xl font-bold text-text-primary mt-1">Elected Board</h2>
                  <p className="text-xs text-text-secondary mt-1">Mandated officers elected in accordance with ACM Chapter bylaws.</p>
                </div>
                {chartered.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No elected board members found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 stagger">
                    {chartered.map((member, i) => (
                      <MemberCard key={member._id} member={member} index={i} />
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Internal Affairs */}
              <div>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-acm-blue">Chapter Governance</span>
                  <h2 className="text-xl md:text-2xl font-bold text-text-primary mt-1">Internal Affairs</h2>
                  <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                    Handles internal chapter operations, decorum, and resolves complaints or feedback from chapter members, IIITU students, or faculty.
                  </p>
                </div>
                {internalAffairs.length === 0 ? (
                  <div className="p-6 bg-card-bg border border-border-color rounded-2xl max-w-2xl text-left space-y-2">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      The <span className="font-semibold text-text-primary">Internal Affairs team</span> oversees chapter standards, conflict resolution, and internal coordination.
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      Any issues or grievances raised by IIITU students, faculty, or chapter members are reviewed confidentially by this division.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 stagger">
                    {internalAffairs.map((member, i) => (
                      <MemberCard key={member._id} member={member} index={i + chartered.length} />
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Interest Group Leads (IGL) */}
              <div>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-acm-blue">Domain Leads</span>
                  <h2 className="text-xl md:text-2xl font-bold text-text-primary mt-1">Interest Group Leads (IGLs)</h2>
                  <p className="text-xs text-text-secondary mt-1">Appointed leads directing technical project verticals, study groups, and research focus areas.</p>
                </div>
                {clubAppointees.length === 0 ? (
                  <p className="text-xs text-text-secondary italic">No interest group leads found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 stagger">
                    {clubAppointees.map((member, i) => (
                      <MemberCard key={member._id} member={member} index={i + chartered.length + internalAffairs.length} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Dev Team Pane — Live GitHub API Data */
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                  Codebase Contributors
                </h2>

                {devLoading ? (
                  <div className="flex items-center justify-center py-12 bg-card-bg border border-border-color rounded-xl">
                    <div className="w-6 h-6 border-2 border-acm-blue border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="text-xs text-text-secondary">Fetching GitHub contributors…</span>
                  </div>
                ) : devContributors.length === 0 ? (
                  <div className="p-8 text-center bg-card-bg border border-border-color rounded-xl text-xs text-text-secondary">
                    No contributors fetched from GitHub.
                  </div>
                ) : (
                  <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-bg-elevated border-b border-border-color text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                      <div className="col-span-8 sm:col-span-9">GitHub Handle</div>
                      <div className="col-span-4 sm:col-span-3 text-right">Merged PRs</div>
                    </div>

                    {devContributors.map((c) => (
                      <div
                        key={c.handle}
                        className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center border-b border-border-subtle last:border-0 hover:bg-bg-elevated/40 transition-colors text-xs"
                      >
                        <div className="col-span-8 sm:col-span-9 flex items-center gap-3">
                          <img
                            src={c.avatarUrl}
                            alt={c.handle}
                            className="w-7 h-7 rounded-full object-cover border border-border-color"
                          />
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-semibold text-acm-blue hover:underline inline-flex items-center gap-1.5"
                          >
                            @{c.handle}
                          </a>
                        </div>
                        <div className="col-span-4 sm:col-span-3 text-right font-mono text-xs font-semibold text-text-primary">
                          {c.prs}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
