import React from 'react';
import { api, resolveImg } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, SectionTitle, Field, TextInput, TextArea, Select,
  PrimaryButton, GhostButton, DangerButton, Badge, Empty,
  ErrorNote, SuccessNote, ImageField, statusColor,
} from '../ui';

const blank = { title: '', description: '', date: '', timeText: '', venue: '', bannerImage: '', status: 'upcoming' };

function fmtDate(ev) {
  if (ev.startsAt) {
    return new Date(ev.startsAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return ev.date || 'Date TBA';
}

function EventRow({ ev, actions }) {
  return (
    <div className="rounded-2xl border border-border-color bg-bg-primary overflow-hidden flex flex-col card-hover">
      {ev.mainImage || ev.bannerImage ? (
        <img src={resolveImg(ev.mainImage || ev.bannerImage)} alt="" className="w-full h-32 object-cover" />
      ) : (
        <div className="w-full h-16 bg-bg-elevated" />
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-text-primary flex-1 min-w-0 truncate">{ev.title}</p>
          <Badge color={statusColor(ev.workflow?.status)}>{(ev.workflow?.status || 'published').replace(/_/g, ' ')}</Badge>
        </div>
        <p className="text-[11px] text-text-secondary mt-1">
          {fmtDate(ev)}{ev.timeText ? ` · ${ev.timeText}` : ''} · {ev.venue || ev.location || 'Venue TBA'}
        </p>
        {ev.workflow?.submittedBy?.name && (
          <p className="text-[11px] text-text-tertiary mt-0.5">
            Proposed by {ev.workflow.submittedBy.name}
            {ev.workflow.submittedBy.userId ? ` (${ev.workflow.submittedBy.userId})` : ''}
          </p>
        )}
        {ev.workflow?.reviewNote && (
          <p className="text-[11px] text-text-tertiary mt-0.5 italic">Note: {ev.workflow.reviewNote}</p>
        )}
        {actions && <div className="flex gap-2 mt-3 flex-wrap pt-3 border-t border-border-subtle">{actions}</div>}
      </div>
    </div>
  );
}

export default function EventsSection() {
  const { canReview } = useAuth();
  const [view, setView] = React.useState(canReview ? 'approvals' : 'propose');
  const [form, setForm] = React.useState(blank);
  const [mine, setMine] = React.useState([]);
  const [queue, setQueue] = React.useState([]);
  const [note, setNote] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const m = await api.get('/v1/events/manage/mine');
      setMine(m.items || []);
    } catch { /* ignore */ }
    if (canReview) {
      try {
        const q = await api.get('/v1/events/manage/queue');
        setQueue((q.items || []).filter((e) => ['draft', 'pending_review', 'approved'].includes(e.workflow?.status || 'draft')));
      } catch { /* ignore */ }
    }
  }, [canReview]);

  React.useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const propose = async (submit) => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post('/v1/events', { ...form, submit });
      setForm(blank);
      setMsg(submit ? 'Submitted for review. Reviewers were notified by email.' : 'Draft saved.');
      setView('mine');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (id, to, withNote = false) => {
    setErr(''); setMsg('');
    try {
      await api.post(`/v1/events/${id}/transition`, { to, note: withNote ? note : '' });
      setNote('');
      setMsg(`Event ${to.replace(/_/g, ' ')}.`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this event proposal?')) return;
    await api.del(`/v1/events/${id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <ErrorNote message={err} />
      <SuccessNote message={msg} />

      <div className="flex gap-1.5 flex-wrap">
        {[
          ['propose', 'Propose event'],
          ['mine', `My proposals${mine.length ? ` (${mine.length})` : ''}`],
          ...(canReview ? [['approvals', `Approvals${queue.length ? ` (${queue.length})` : ''}`]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              view === id ? 'bg-acm-blue text-white' : 'border border-border-color text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'propose' && (
        <Card>
          <SectionTitle hint="Goes to exec + HoD for approval before publishing">Propose an event</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            <div className="space-y-3.5">
              <Field label="Event title *">
                <TextInput value={form.title} onChange={set('title')} placeholder="Intro to Git & GitHub" />
              </Field>
              <Field label="Description *">
                <TextArea rows="5" value={form.description} onChange={set('description')} placeholder="What will attendees learn or build?" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Date *">
                  <TextInput value={form.date} onChange={set('date')} placeholder="March 10, 2026" />
                </Field>
                <Field label="Time">
                  <TextInput value={form.timeText} onChange={set('timeText')} placeholder="10:00 AM – 12:00 PM" />
                </Field>
                <Field label="Venue / place *">
                  <TextInput value={form.venue} onChange={set('venue')} placeholder="Seminar Hall, IIIT Una" />
                </Field>
              </div>
              <Field label="Listing">
                <Select value={form.status} onChange={set('status')}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </Select>
              </Field>
              <div className="flex gap-2">
                <PrimaryButton disabled={busy} onClick={() => propose(true)}>Submit for review</PrimaryButton>
                <GhostButton disabled={busy} onClick={() => propose(false)}>Save draft</GhostButton>
              </div>
            </div>
            <div className="lg:pl-2">
              <ImageField label="Banner image *" value={form.bannerImage} onChange={(v) => setForm({ ...form, bannerImage: v })} />
            </div>
          </div>
        </Card>
      )}

      {view === 'mine' && (
        <Card>
          <SectionTitle hint="Track reviewer decisions here">My proposals</SectionTitle>
          {mine.length === 0 ? (
            <Empty title="No proposals yet" hint="Propose your first event to get started." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mine.map((ev) => (
                <EventRow
                  key={ev._id}
                  ev={ev}
                  actions={
                    <>
                      {['draft', 'rejected'].includes(ev.workflow?.status) && (
                        <GhostButton className="!px-3 !py-1 !text-xs" onClick={() => act(ev._id, 'pending_review')}>
                          Submit
                        </GhostButton>
                      )}
                      {ev.workflow?.status === 'draft' && (
                        <DangerButton onClick={() => remove(ev._id)}>Delete</DangerButton>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {view === 'approvals' && canReview && (
        <Card>
          <SectionTitle hint="Approve, publish or reject with a note — the proposer is emailed">Review queue</SectionTitle>
          <Field label="Decision note (required to reject)">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please add a venue and banner first" />
          </Field>
          {queue.length === 0 ? (
            <div className="mt-3"><Empty title="Queue is clear" hint="New proposals appear here." /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
              {queue.map((ev) => (
                <EventRow
                  key={ev._id}
                  ev={ev}
                  actions={
                    <>
                      <GhostButton className="!px-3 !py-1 !text-xs" onClick={() => act(ev._id, 'approved')}>
                        Approve
                      </GhostButton>
                      <GhostButton className="!px-3 !py-1 !text-xs" onClick={() => act(ev._id, 'published')}>
                        Publish
                      </GhostButton>
                      <DangerButton onClick={() => act(ev._id, 'rejected', true)}>Reject</DangerButton>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
