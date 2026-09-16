import React from 'react';
import { Calendar, MapPin, Clock, ExternalLink } from 'lucide-react';
import { API } from '../utils/apiURL';
import { resolveImg } from '../utils/api';
import { useFocusRefresh } from '../utils/useFocusRefresh';
import { Page, Badge, Empty, Spinner } from '../components/ui';

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
    <Page
      title="Events & Workshops"
      subtitle="Hackathons, bootcamps, tech talks and research workshops."
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
    >
      {loading ? (
        <Spinner label="Loading events…" />
      ) : shown.length === 0 ? (
        <Empty title={filter === 'upcoming' ? 'No upcoming events' : 'No past events yet'} hint="Check back soon." />
      ) : (
        <div className="space-y-5">
          {shown.map((ev) => (
            <article key={ev._id} className="bg-card-bg border border-border-color rounded-2xl overflow-hidden card-hover flex flex-col md:flex-row">
              {(ev.mainImage || ev.bannerImage) && (
                <div className="md:w-2/5 min-h-[200px] bg-bg-secondary">
                  <img src={resolveImg(ev.mainImage || ev.bannerImage)} alt={ev.title} className="w-full h-full object-cover min-h-[200px]" />
                </div>
              )}
              <div className="flex-1 p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {(ev.verticals || []).map((v, i) => (
                    <Badge key={i} color="blue">{v}</Badge>
                  ))}
                  {ev.status && <Badge color={ev.status === 'completed' ? 'gray' : 'green'}>{ev.status}</Badge>}
                </div>
                <h2 className="text-xl font-bold text-text-primary tracking-tight">{ev.title}</h2>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-acm-blue" />{fmtDate(ev)}</span>
                  {(ev.timeText) && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-acm-blue" />{ev.timeText}</span>}
                  {(ev.venue || ev.location) && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-acm-blue" />{ev.venue || ev.location}</span>}
                </div>
                {ev.description && <p className="text-sm text-text-secondary leading-relaxed">{ev.description}</p>}
                {ev.gallery?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {ev.gallery.slice(0, 5).map((g, i) => (
                      <img key={i} src={resolveImg(g)} alt="" className="w-16 h-16 rounded-lg object-cover border border-border-color" />
                    ))}
                  </div>
                )}
                {ev.galleryLink && (
                  <a href={ev.galleryLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-acm-blue hover:underline w-fit">
                    View all photos <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
