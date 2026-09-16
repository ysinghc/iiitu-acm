import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, Field, TextInput, Select,
  PrimaryButton, GhostButton, DangerButton, Badge, Empty,
  ErrorNote, SuccessNote,
} from '../ui';
import { roleLabel } from '../../utils/roles';

const ALL_ROLES = ['chair', 'vice_chair', 'treasurer', 'secretary', 'hod', 'expert', 'scholar', 'fellow', 'member'];

export default function PeopleSection() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [q, setQ] = React.useState(params.get('q') || '');

  // Follow ?q= navigation (e.g. roster deep-links) without clobbering typing.
  React.useEffect(() => {
    const v = params.get('q');
    if (v !== null) setQ(v);
  }, [params]);
  const [role, setRole] = React.useState('');
  const [people, setPeople] = React.useState([]);
  const [experts, setExperts] = React.useState([]);
  const [groups, setGroups] = React.useState([]);
  const [depts, setDepts] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [err, setErr] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [showInvite, setShowInvite] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [invite, setInvite] = React.useState({ name: '', email: '', role: 'member', department: user.department || '', batch: '' });

  const canInvite = ['chair', 'vice_chair', 'secretary', 'treasurer', 'hod', 'expert'].includes(user.role);
  const canManage = ['chair', 'vice_chair', 'secretary', 'treasurer', 'hod'].includes(user.role);
  const isExec = ['chair', 'vice_chair', 'secretary', 'treasurer'].includes(user.role);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get(`/v1/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ''}&limit=50`);
      setPeople(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.message);
    }
  }, [q, role]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Expert directory for the mentor picker (dept-scoped by the API for HoDs).
  React.useEffect(() => {
    if (!canManage) return;
    api.get('/v1/users?role=expert&limit=100')
      .then((d) => setExperts(d.items || []))
      .catch(() => {});
    api.get('/public/interest-groups', { auth: false })
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .catch(() => {});
    api.get('/api/admin/departments/all')
      .then((d) => setDepts(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [canManage]);

  const sendInvite = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      const data = await api.post('/v1/auth/users', invite);
      setMsg(data.tempPassword
        ? `Account ${data.user.userId} created. Temporary password: ${data.tempPassword}`
        : `Account ${data.user.userId} created and invite emailed.`);
      setShowInvite(false);
      setInvite({ name: '', email: '', role: 'member', department: user.department || '', batch: '' });
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const saveEdit = async (id, patch) => {
    setErr(''); setMsg('');
    try {
      await api.patch(`/v1/users/${id}`, patch);
      setEditing(null);
      setMsg('Updated.');
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const deactivate = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}'s account? Their authored content stays but becomes unattributed.`)) return;
    setErr(''); setMsg('');
    try {
      await api.del(`/v1/users/${id}`);
      setMsg('Account permanently deleted.');
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <div className="space-y-4">
      <ErrorNote message={err} />
      <SuccessNote message={msg} />

      <Card>
        <div className="flex gap-2 flex-wrap items-center mb-4">
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="!w-56" />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="!w-44">
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </Select>
          <span className="text-[11px] text-text-tertiary ml-auto">{total} people</span>
          {canInvite && (
            <button onClick={() => setShowInvite(!showInvite)} className="text-xs font-bold text-acm-blue hover:underline">
              {showInvite ? '− Close invite' : '+ Invite'}
            </button>
          )}
        </div>

        {showInvite && canInvite && (
          <form onSubmit={sendInvite} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-3 mb-4 rounded-xl bg-bg-primary border border-border-color">
            <TextInput required value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} placeholder="Full name" />
            <TextInput required type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="Email" />
            <Select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
            <Select value={invite.department} onChange={(e) => setInvite({ ...invite, department: e.target.value })}>
              <option value="">No department</option>
              {depts.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}{d.visibility === 'private' ? ' (private)' : ''}</option>
              ))}
            </Select>
            <PrimaryButton type="submit" className="!text-xs">Send invite</PrimaryButton>
          </form>
        )}

        {people.length === 0 ? (
          <Empty title="Nobody here" hint="Try a different search." />
        ) : (
          <div className="divide-y divide-border-subtle">
            {people.map((p) => (
              <PersonRow
                key={p._id}
                person={p}
                me={user}
                canManage={canManage}
                isExec={isExec}
                experts={experts}
                groups={groups}
                depts={depts}
                editing={editing === p._id}
                onEdit={() => setEditing(p._id)}
                onCancel={() => setEditing(null)}
                onSave={saveEdit}
                onDeactivate={deactivate}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PersonRow({ person: p, me, canManage, isExec, experts, groups, depts, editing, onEdit, onCancel, onSave, onDeactivate }) {
  const [patch, setPatch] = React.useState({
    role: p.role,
    department: p.department || '',
    mentor: p.mentor?._id || p.mentor || '',
    interestGroup: p.interestGroup?._id || p.interestGroup || '',
    isActive: p.isActive,
  });
  const isSelf = String(p._id) === String(me._id);
  const isLearnerTarget = ['scholar', 'fellow'].includes(patch.role);
  const mentorOptions = [...(experts || [])];
  if (p.mentor?._id && !mentorOptions.some((e) => String(e._id) === String(p.mentor._id))) {
    mentorOptions.push({ _id: p.mentor._id, name: p.mentor.name, userId: p.mentor.userId });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <div className="w-8 h-8 rounded-full bg-acm-blue/10 text-acm-blue flex items-center justify-center text-xs font-bold flex-shrink-0">
          {p.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate">
            {p.name} {isSelf && <span className="text-[10px] text-text-tertiary">(you)</span>}
          </p>
          <p className="text-[11px] text-text-secondary">
            <span className="font-mono font-bold text-acm-blue">{p.userId}</span>
            {` · ${roleLabel(p.role)}`}{p.department ? ` · ${p.department}` : ''}{p.batch ? ` · ${p.batch}` : ''}
            {p.interestGroup?.name ? ` · ${p.interestGroup.name}` : ''}
            {p.mentor?.name ? ` · mentored by ${p.mentor.name} (${p.mentor.userId || ''})` : ''}
          </p>
        </div>
        {!p.isActive && <Badge color="red">inactive</Badge>}
        {canManage && !isSelf && (
          <GhostButton className="!px-3 !py-1 !text-xs" onClick={onEdit}>Manage</GhostButton>
        )}
      </div>
    );
  }

  return (
    <div className="py-3 space-y-2">
      <p className="text-sm font-bold text-text-primary">
        {p.name} <span className="font-mono text-acm-blue">{p.userId}</span>
        <span className="font-normal text-text-secondary"> · {p.email}</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {isExec && (
          <Field label="Role">
            <Select value={patch.role} onChange={(e) => setPatch({ ...patch, role: e.target.value })}>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Department">
          <Select value={patch.department} onChange={(e) => setPatch({ ...patch, department: e.target.value })}>
            <option value="">No department</option>
            {depts.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}{d.visibility === 'private' ? ' (private)' : ''}</option>
            ))}
            {p.department && !depts.some((d) => d.slug === p.department) && (
              <option value={p.department}>{p.department} (removed)</option>
            )}
          </Select>
        </Field>
        <Field label="Mentor (expert)">
          <Select
            value={patch.mentor}
            onChange={(e) => setPatch({ ...patch, mentor: e.target.value })}
            disabled={!isLearnerTarget}
          >
            <option value="">— No mentor —</option>
            {mentorOptions.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}{e.userId ? ` (${e.userId})` : ''}{e.department ? ` · ${e.department}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vertical (interest group)">
          <Select value={patch.interestGroup} onChange={(e) => setPatch({ ...patch, interestGroup: e.target.value })}>
            <option value="">— None —</option>
            {(groups || []).map((g) => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </Select>
        </Field>
        {isExec && (
          <Field label="Active">
            <Select value={String(patch.isActive)} onChange={(e) => setPatch({ ...patch, isActive: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
        )}
      </div>
      <div className="flex gap-2">
        <PrimaryButton className="!px-3 !py-1.5 !text-xs" onClick={() => onSave(p._id, { ...patch, mentor: patch.mentor || null, interestGroup: patch.interestGroup || null })}>
          Save
        </PrimaryButton>
        <GhostButton className="!px-3 !py-1.5 !text-xs" onClick={onCancel}>Cancel</GhostButton>
        {isExec && <DangerButton onClick={() => onDeactivate(p._id, p.name)}>Delete</DangerButton>}
      </div>
    </div>
  );
}
