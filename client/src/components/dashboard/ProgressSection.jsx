import React from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, Field, TextInput, TextArea, Select,
  PrimaryButton, GhostButton, DangerButton, Badge, Empty,
  ErrorNote, SuccessNote, statusColor,
} from '../ui';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const blankWeeks = () => [1, 2, 3, 4].map(() => ({ goals: '', kpiScore: '', remarks: '' }));

function useProgress() {
  const { user } = useAuth();
  const [kind, setKind] = React.useState('reports');
  const [month, setMonth] = React.useState(currentMonth());
  const [status, setStatus] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [mentees, setMentees] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [openId, setOpenId] = React.useState(null);

  const load = React.useCallback(async () => {
    const q = `?month=${month}${status ? `&status=${status}` : ''}`;
    try {
      const data = kind === 'reports'
        ? await api.get(`/v1/progress/reports${q}`)
        : await api.get(`/v1/progress/summaries${q}`);
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    }
  }, [kind, month, status]);

  const loadMentees = React.useCallback(async () => {
    try {
      const data = await api.get('/v1/users/mentees/mine');
      setMentees(data.items || []);
    } catch { /* learners get [] */ }
  }, []);

  React.useEffect(() => { load(); loadMentees(); }, [load, loadMentees]);

  const run = async (fn, okMsg) => {
    setErr(''); setMsg(''); setBusy(true);
    try {
      const out = await fn();
      setMsg(okMsg);
      await load();
      return out;
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return { user, kind, setKind, month, setMonth, status, setStatus, items, mentees, busy, err, msg, openId, setOpenId, run, load };
}

function DecisionBar({ onDecide }) {
  const [note, setNote] = React.useState('');
  return (
    <div className="flex gap-2 flex-wrap items-center mt-3">
      <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required unless approving)" className="!w-64" />
      <GhostButton className="!px-3 !py-1.5 !text-xs" onClick={() => onDecide('approved', note)}>Approve</GhostButton>
      <GhostButton className="!px-3 !py-1.5 !text-xs" onClick={() => onDecide('changes_requested', note)}>Request changes</GhostButton>
      <DangerButton onClick={() => onDecide('rejected', note)}>Reject</DangerButton>
    </div>
  );
}

/* ------------------------------- reports ------------------------------ */

function Reports({ ctx }) {
  const { user, items, mentees, busy, openId, setOpenId, run } = ctx;
  const canFile = ['chair', 'vice_chair', 'secretary', 'treasurer', 'hod', 'expert'].includes(user.role);
  const [form, setForm] = React.useState({ studentId: '', month: currentMonth(), weeks: blankWeeks(), overallRemarks: '' });
  const [showNew, setShowNew] = React.useState(false);

  React.useEffect(() => {
    if (mentees.length > 0 && !form.studentId) setForm((f) => ({ ...f, studentId: mentees[0]._id }));
  }, [mentees]); // eslint-disable-line

  const setWeek = (i, k, v) => {
    const weeks = form.weeks.map((w, j) => (j === i ? { ...w, [k]: v } : w));
    setForm({ ...form, weeks });
  };

  const create = () =>
    run(
      () => api.post('/v1/progress/reports', {
        studentId: form.studentId,
        month: form.month,
        weeks: form.weeks.map((w) => ({ ...w, kpiScore: w.kpiScore === '' ? null : Number(w.kpiScore) })),
        overallRemarks: form.overallRemarks,
      }),
      'Report created as draft.'
    ).then(() => { setShowNew(false); setForm({ studentId: form.studentId, month: currentMonth(), weeks: blankWeeks(), overallRemarks: '' }); });

  return (
    <div className="space-y-3">
      {canFile && (
        <button onClick={() => setShowNew(!showNew)} className="text-xs font-bold text-acm-blue hover:underline">
          {showNew ? '− Close new report' : '+ New monthly report'}
        </button>
      )}

      {showNew && canFile && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <Field label="Student">
              <Select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                {mentees.map((m) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                ))}
              </Select>
            </Field>
            <Field label="Month">
              <TextInput type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {form.weeks.map((w, i) => (
              <div key={i} className="p-3 rounded-xl border border-border-color bg-bg-primary space-y-2">
                <p className="text-xs font-bold text-text-primary">Week {i + 1}</p>
                <TextArea rows="2" value={w.goals} onChange={(e) => setWeek(i, 'goals', e.target.value)} placeholder="Goals for the week" />
                <div className="grid grid-cols-2 gap-2">
                  <TextInput type="number" min="0" max="100" value={w.kpiScore} onChange={(e) => setWeek(i, 'kpiScore', e.target.value)} placeholder="KPI 0–100" />
                  <TextInput value={w.remarks} onChange={(e) => setWeek(i, 'remarks', e.target.value)} placeholder="Remarks" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Field label="Overall remarks">
              <TextArea rows="2" value={form.overallRemarks} onChange={(e) => setForm({ ...form, overallRemarks: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3">
            <PrimaryButton disabled={busy} onClick={create}>Save draft</PrimaryButton>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty title="No reports" hint="Filter by a different month, or file a new report." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {items.map((r) => {
          const open = openId === r._id;
          const mine = String(r.student?._id || r.student) === String(user._id);
          const hodScope = user.role === 'hod' && user.department === r.department;
          const execScope = ['chair', 'vice_chair', 'secretary', 'treasurer'].includes(user.role);
          return (
            <Card key={r._id} className={`!p-4 ${open ? 'xl:col-span-2' : ''}`}>
              <button onClick={() => setOpenId(open ? null : r._id)} className="w-full text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-text-primary">{r.student?.name || 'Student'}</p>
                  <Badge color="gray">{r.month}</Badge>
                  <Badge color={statusColor(r.status)}>{r.status.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  <span className="font-mono text-acm-blue">{r.student?.userId}</span>
                  {` · Mentor: ${r.mentor?.name || '—'}`}{r.mentor?.userId ? ` (${r.mentor.userId})` : ''}
                  {` · Signed: ${r.studentSignature?.signedAt ? 'yes' : 'no'}`}
                </p>
              </button>

              {open && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                    {r.weeks.map((w, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-bg-primary border border-border-color">
                        <p className="text-[11px] font-bold text-text-primary">W{i + 1} · {w.kpiScore ?? '–'}/100</p>
                        <p className="text-[11px] text-text-secondary mt-1">{w.goals || '—'}</p>
                        {w.remarks && <p className="text-[11px] text-text-tertiary italic mt-0.5">{w.remarks}</p>}
                      </div>
                    ))}
                  </div>
                  {r.overallRemarks && <p className="text-xs text-text-secondary mt-2">{r.overallRemarks}</p>}
                  {r.hodReview?.note && (
                    <p className="text-[11px] text-text-tertiary mt-1 italic">HoD: {r.hodReview.note}</p>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {['draft', 'changes_requested'].includes(r.status) && canFile && (
                      <PrimaryButton
                        className="!px-3 !py-1.5 !text-xs" disabled={busy}
                        onClick={() => run(() => api.post(`/v1/progress/reports/${r._id}/submit`), 'Sent to student for signature.')}
                      >
                        Submit to student
                      </PrimaryButton>
                    )}
                    {r.status === 'pending_student' && mine && (
                      <PrimaryButton
                        className="!px-3 !py-1.5 !text-xs" disabled={busy}
                        onClick={() => run(() => api.post(`/v1/progress/reports/${r._id}/sign`, { name: user.name }), 'Signed and forwarded to HoD.')}
                      >
                        Sign report
                      </PrimaryButton>
                    )}
                  </div>
                  {r.status === 'pending_hod' && (hodScope || execScope) && (
                    <DecisionBar
                      onDecide={(decision, note) =>
                        run(() => api.post(`/v1/progress/reports/${r._id}/decision`, { decision, note }), `Report ${decision}.`)
                      }
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ summaries ----------------------------- */

function Summaries({ ctx }) {
  const { user, items, busy, openId, setOpenId, run } = ctx;
  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState({
    month: currentMonth(), accomplishments: '', eventsAttended: 0,
    sessionsHosted: 0, projectsShipped: 0, papersSubmitted: 0,
    learningHours: 0, challenges: '', nextGoals: '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = () =>
    run(
      () => api.post('/v1/progress/summaries', {
        month: form.month,
        accomplishments: form.accomplishments.split('\n').map((s) => s.trim()).filter(Boolean),
        metrics: {
          eventsAttended: Number(form.eventsAttended) || 0,
          sessionsHosted: Number(form.sessionsHosted) || 0,
          projectsShipped: Number(form.projectsShipped) || 0,
          papersSubmitted: Number(form.papersSubmitted) || 0,
          learningHours: Number(form.learningHours) || 0,
        },
        challenges: form.challenges,
        nextGoals: form.nextGoals,
      }),
      'Summary saved as draft.'
    ).then(() => setShowNew(false));

  const [mentorNote, setMentorNote] = React.useState('');

  return (
    <div className="space-y-3">
      {['scholar', 'fellow'].includes(user.role) && (
        <button onClick={() => setShowNew(!showNew)} className="text-xs font-bold text-acm-blue hover:underline">
          {showNew ? '− Close' : '+ New month-end summary'}
        </button>
      )}

      {showNew && (
        <Card>
          <div className="space-y-3">
            <Field label="Month">
              <TextInput type="month" value={form.month} onChange={set('month')} />
            </Field>
            <Field label="What was accomplished (one per line)">
              <TextArea rows="4" value={form.accomplishments} onChange={set('accomplishments')} placeholder={'Shipped campus dashboard v1\nWon inter-IIIT hackathon\n…'} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[['eventsAttended', 'Events'], ['sessionsHosted', 'Hosted'], ['projectsShipped', 'Projects'], ['papersSubmitted', 'Papers'], ['learningHours', 'Hours']].map(([k, label]) => (
                <Field key={k} label={label}>
                  <TextInput type="number" min="0" value={form[k]} onChange={set(k)} />
                </Field>
              ))}
            </div>
            <Field label="Challenges">
              <TextArea rows="2" value={form.challenges} onChange={set('challenges')} />
            </Field>
            <Field label="Next month goals">
              <TextArea rows="2" value={form.nextGoals} onChange={set('nextGoals')} />
            </Field>
            <PrimaryButton disabled={busy} onClick={create}>Save draft</PrimaryButton>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty title="No summaries" hint="Month-end accomplishments appear here." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {items.map((s) => {
          const open = openId === s._id;
          const mine = String(s.student?._id || s.student) === String(user._id);
          const hodScope = user.role === 'hod' && user.department === s.department;
          const execScope = ['chair', 'vice_chair', 'secretary', 'treasurer'].includes(user.role);
          const mentorScope = user.role === 'expert' && String(s.mentor?._id || s.mentor) === String(user._id);
          return (
            <Card key={s._id} className={`!p-4 ${open ? 'xl:col-span-2' : ''}`}>
              <button onClick={() => setOpenId(open ? null : s._id)} className="w-full text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-text-primary">{s.student?.name || 'Student'}</p>
                  <Badge color="gray">{s.month}</Badge>
                  <Badge color={statusColor(s.status)}>{s.status.replace(/_/g, ' ')}</Badge>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  <span className="font-mono text-acm-blue">{s.student?.userId}</span>
                  {` · ${(s.accomplishments || []).length} accomplishments · ${s.metrics?.projectsShipped ?? 0} projects · ${s.metrics?.learningHours ?? 0}h`}
                </p>
              </button>

              {open && (
                <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                  <ul className="list-disc pl-5 text-xs text-text-secondary space-y-1">
                    {(s.accomplishments || []).map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                  {s.challenges && <p className="text-xs text-text-secondary"><strong>Challenges:</strong> {s.challenges}</p>}
                  {s.nextGoals && <p className="text-xs text-text-secondary"><strong>Next:</strong> {s.nextGoals}</p>}
                  {s.mentorNote && <p className="text-[11px] text-text-tertiary italic">Mentor: {s.mentorNote}</p>}
                  {s.hodReview?.note && <p className="text-[11px] text-text-tertiary italic">HoD: {s.hodReview.note}</p>}

                  <div className="flex gap-2 flex-wrap">
                    {['draft', 'changes_requested'].includes(s.status) && mine && (
                      <PrimaryButton
                        className="!px-3 !py-1.5 !text-xs" disabled={busy}
                        onClick={() => run(() => api.post(`/v1/progress/summaries/${s._id}/advance`), 'Sent to mentor.')}
                      >
                        Submit to mentor
                      </PrimaryButton>
                    )}
                    {s.status === 'pending_mentor' && (mentorScope || hodScope || execScope) && (
                      <>
                        <TextInput value={mentorNote} onChange={(e) => setMentorNote(e.target.value)} placeholder="Mentor note" className="!w-56" />
                        <PrimaryButton
                          className="!px-3 !py-1.5 !text-xs" disabled={busy}
                          onClick={() => run(() => api.post(`/v1/progress/summaries/${s._id}/advance`, { mentorNote }), 'Forwarded to HoD.')}
                        >
                          Add note & forward to HoD
                        </PrimaryButton>
                      </>
                    )}
                  </div>
                  {s.status === 'pending_hod' && (hodScope || execScope) && (
                    <DecisionBar
                      onDecide={(decision, note) =>
                        run(() => api.post(`/v1/progress/summaries/${s._id}/decision`, { decision, note }), `Summary ${decision}.`)
                      }
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- shell ------------------------------- */

export default function ProgressSection() {
  const ctx = useProgress();
  const { kind, setKind, month, setMonth, status, setStatus, err, msg } = ctx;

  return (
    <div className="space-y-4">
      <ErrorNote message={err} />
      <SuccessNote message={msg} />

      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1.5">
          {[['reports', 'Monthly KPI reports'], ['summaries', 'Month-end summaries']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setKind(id); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                kind === id ? 'bg-acm-blue text-white' : 'border border-border-color text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <TextInput type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="!w-40" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-44">
            <option value="">All states</option>
            <option value="draft">Draft</option>
            <option value="pending_student">Awaiting signature</option>
            <option value="pending_mentor">With mentor</option>
            <option value="pending_hod">With HoD</option>
            <option value="approved">Approved</option>
            <option value="changes_requested">Changes requested</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>
      </div>

      {kind === 'reports' ? <Reports ctx={ctx} /> : <Summaries ctx={ctx} />}
    </div>
  );
}
