import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderKanban } from 'lucide-react';
import { API } from '../../utils/apiURL';

function SkeletonCard() {
  return (
    <div className="bg-card-bg border border-border-color rounded-2xl p-6 md:p-8 animate-pulse flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 bg-bg-elevated rounded w-1/2" />
          <div className="w-8 h-8 rounded-lg bg-bg-elevated" />
        </div>
        <div className="h-4 bg-bg-elevated rounded w-full mt-4" />
        <div className="h-4 bg-bg-elevated rounded w-3/4 mt-2" />
      </div>
      <div className="flex gap-2 mt-6">
        <div className="h-5 w-20 bg-bg-elevated rounded-md" />
        <div className="h-5 w-24 bg-bg-elevated rounded-md" />
      </div>
    </div>
  );
}

export default function Verticals() {
  const [departments, setDepartments] = useState([]);
  const [groupsByDept, setGroupsByDept] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [deptsRes, igsRes] = await Promise.all([
          fetch(`${API}/public/departments`),
          fetch(`${API}/public/interest-groups`),
        ]);

        if (!deptsRes.ok) throw new Error('Failed to fetch departments');

        const depts = await deptsRes.json();
        setDepartments(depts);

        if (igsRes.ok) {
          const igs = await igsRes.json();
          const grouped = {};
          for (const ig of igs) {
            const deptId = ig.department?._id || ig.department;
            if (!deptId) continue;
            if (!grouped[deptId]) grouped[deptId] = [];
            grouped[deptId].push(ig.name);
          }
          setGroupsByDept(grouped);
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-bg-primary transition-colors duration-300">
      {/* Page Header */}
      <div className="bg-bg-secondary border-b border-border-color">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 md:py-12">
          <span className="acm-tag">Verticals</span>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-text-primary">
            Departments
          </h1>
          <p className="mt-2 text-text-secondary text-sm max-w-md leading-relaxed">
            Explore our specialized divisions driving research, engineering, and student innovation.
          </p>
        </div>
      </div>

      {/* Main Content Area filling remaining space */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-8 py-8 md:py-12 flex flex-col justify-center">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && (
          <div className="text-center py-16 my-auto">
            <p className="text-text-secondary text-sm">Could not load departments. Please try again later.</p>
          </div>
        )}

        {!loading && !error && departments.length === 0 && (
          <div className="text-center py-16 my-auto">
            <p className="text-text-secondary text-sm">No departments found.</p>
          </div>
        )}

        {!loading && !error && departments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 my-auto">
            {departments.map((dept) => {
              const groups = groupsByDept[dept._id] || [];

              return (
                <Link
                  key={dept._id}
                  to={`/verticals/${dept.slug}`}
                  className="group block h-full"
                >
                  <div className="bg-card-bg border border-border-color rounded-2xl p-7 md:p-8 hover:border-acm-blue/40 transition-all duration-300 hover:shadow-lg hover:shadow-acm-blue/5 flex flex-col justify-between h-full group-hover:-translate-y-0.5">
                    <div>
                      {/* Top Header & Link Action */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-acm-blue/10 flex items-center justify-center text-acm-blue flex-shrink-0">
                            <FolderKanban className="h-5 w-5" strokeWidth={1.8} />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-text-primary group-hover:text-acm-blue transition-colors">
                              {dept.name}
                            </h2>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-tertiary group-hover:text-acm-blue group-hover:bg-acm-blue/10 transition-all flex-shrink-0">
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      </div>

                      {/* Clean Description */}
                      <p className="text-text-secondary text-sm leading-relaxed line-clamp-3">
                        {dept.description}
                      </p>
                    </div>

                    {/* Minimal Groups Footer */}
                    {groups.length > 0 && (
                      <div className="pt-6 mt-6 border-t border-border-subtle flex items-center gap-2 overflow-hidden text-xs text-text-tertiary">
                        <span className="font-medium text-text-secondary flex-shrink-0">
                          {groups.length} {groups.length === 1 ? 'Vertical' : 'Verticals'}:
                        </span>
                        <span className="truncate text-text-secondary/80">
                          {groups.join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
