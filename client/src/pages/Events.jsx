import React from 'react';
import { Calendar, MapPin, Clock, ExternalLink, ArrowUpRight } from 'lucide-react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { SiteHeader, SiteBody, Badge, Empty, Spinner } from '../components/ui';

function fmtDate(ev) {
  if (ev.startsAt) {
    return new Date(ev.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return ev.date || 'Date TBA';
}

export default function Events() {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('upcoming');

  const load = React.useCallback(async () => {
    try {
      // Prefer the v1 workflow-aware listing; fall back to legacy.
      const v1 = await fetch(`${API}/v1/events?limit=50`).then((r) => r.json());
      if (v1.items) setEvents(v1.items);
      else {
        const legacy = await fetch(`${API}/public/events`).then((r) => r.json());
        setEvents(Array.isArray(legacy) ? legacy : []);
      }
    } catch {
      try {
        const legacy = await fetch(`${API}/public/events`).then((r) => r.json());
        setEvents(Array.isArray(legacy) ? legacy : []);
      } catch { /* offline */ }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  useFocusRefresh(load);

  const upcoming = events.filter((e) => e.status !== 'completed');
  const past = events.filter((e) => e.status === 'completed');
  const shown = filter === 'upcoming' ? upcoming : past;

  return (
    <div className="flex-1 flex flex-col bg-bg-primary transition-colors duration-300">
      <SiteHeader
        kicker="Events"
        title="Events & Workshops"
        desc="Hackathons, bootcamps, tech talks and research workshops."
        action={
          <div className="flex gap-1.5">
            {[['upcoming', `Upcoming (${upcoming.length})`], ['past', `Past (${past.length})`]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filter === id ? 'bg-acm-blue text-white' : 'border border-border-color text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <SiteBody>
        {loading ? (
          <Spinner label="Loading events…" />
        ) : shown.length === 0 ? (
          <Empty title={filter === 'upcoming' ? 'No upcoming events' : 'No past events yet'} hint="Check back soon." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {shown.map((ev) => (
              <article key={ev._id} className="group bg-card-bg border border-border-color rounded-2xl overflow-hidden card-hover flex flex-col h-full">
                {(ev.mainImage || ev.bannerImage) && (
                  <div className="h-44 bg-bg-secondary overflow-hidden flex-shrink-0">
                    <img src={resolveImg(ev.mainImage || ev.bannerImage)} alt={ev.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="flex-1 p-6 md:p-7 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(ev.verticals || []).map((v, i) => (
                      <Badge key={i} color="blue">{v}</Badge>
                    ))}
                    {ev.status && <Badge color={ev.status === 'completed' ? 'gray' : 'green'}>{ev.status}</Badge>}
                  </div>
                  <h2 className="text-lg font-bold text-text-primary tracking-tight group-hover:text-acm-blue transition-colors">
                    {ev.title}
                  </h2>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-acm-blue" />{fmtDate(ev)}</span>
                    {(ev.timeText) && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-acm-blue" />{ev.timeText}</span>}
                    {(ev.venue || ev.location) && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-acm-blue" />{ev.venue || ev.location}</span>}
                  </div>
                  {ev.description && <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{ev.description}</p>}
                  <div className="mt-auto pt-4 border-t border-border-subtle flex items-center gap-2">
                    {ev.gallery?.length > 0 && (
                      <div className="flex gap-2 flex-wrap flex-1">
                        {ev.gallery.slice(0, 5).map((g, i) => (
                          <img key={i} src={resolveImg(g)} alt="" className="w-12 h-12 rounded-lg object-cover border border-border-color" />
                        ))}
                      </div>
                    )}
                    {ev.galleryLink && (
                      <a href={ev.galleryLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-acm-blue hover:underline ml-auto">
                        Photos <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {!ev.gallery?.length && !ev.galleryLink && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-tertiary ml-auto">
                        Details <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SiteBody>
    </div>
  );
}
