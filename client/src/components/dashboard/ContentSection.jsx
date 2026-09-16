import React from 'react';
import { api, resolveImg } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, SectionTitle, Field, TextInput, TextArea, Select,
  PrimaryButton, GhostButton, DangerButton, Empty,
  ErrorNote, SuccessNote, ImageField,
} from '../ui';

/**
 * Site-content manager. People are NOT managed here — accounts live under
 * Dashboard → People and flow onto the site automatically.
 */
const ENTITIES = {
  carousel: {
    label: 'Hero slides',
    list: '/public/carousel', write: (id) => `/admin/carousel${id ? `/${id}` : ''}`,
    fields: [
      { k: 'title', label: 'Title', t: 'text' },
      { k: 'description', label: 'Description', t: 'textarea' },
      { k: 'imageUrl', label: 'Image', t: 'image' },
      { k: 'order', label: 'Order', t: 'number' },
    ],
  },
  departments: {
    label: 'Departments',
    list: '/public/departments', write: (id) => `/admin/departments${id ? `/${id}` : ''}`,
    fields: [
      { k: 'slug', label: 'Slug', t: 'text', req: true },
      { k: 'name', label: 'Name', t: 'text', req: true },
      { k: 'description', label: 'Description', t: 'textarea' },
      { k: 'mission', label: 'Mission', t: 'textarea' },
      { k: 'bannerImageUrl', label: 'Banner', t: 'image' },
    ],
  },
  'interest-groups': {
    label: 'Interest groups',
    list: '/public/interest-groups', write: (id) => `/admin/interest-groups${id ? `/${id}` : ''}`,
    hint: 'The lead must be an expert account — invite them under People first.',
    fields: [
      { k: 'name', label: 'Name', t: 'text', req: true },
      { k: 'department', label: 'Department', t: 'dept' },
      { k: 'igl', label: 'Lead expert', t: 'expert' },
      { k: 'areaOfInterest', label: 'Focus area', t: 'text' },
      { k: 'description', label: 'Description', t: 'textarea' },
      { k: 'order', label: 'Order', t: 'number' },
    ],
  },
};

function FieldInput({ f, value, onChange, depts, experts }) {
  if (f.t === 'textarea') return <TextArea rows="2" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  if (f.t === 'image') return <ImageField label={f.label} value={value || ''} onChange={onChange} />;
  if (f.t === 'number') return <TextInput type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
  if (f.t === 'select') {
    return (
      <Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    );
  }
  if (f.t === 'dept') {
    return (
      <Select value={typeof value === 'object' ? value?._id || '' : value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(depts || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
      </Select>
    );
  }
  if (f.t === 'expert') {
    const current = typeof value === 'object' ? value?._id || '' : value || '';
    return (
      <Select value={current} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— No lead —</option>
        {(experts || []).map((e) => (
          <option key={e._id} value={e._id}>{e.name}{e.userId ? ` (${e.userId})` : ''}</option>
        ))}
      </Select>
    );
  }
  return <TextInput value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

function EntityManager({ id, depts, experts, notify }) {
  const cfg = ENTITIES[id];
  const [items, setItems] = React.useState([]);
  const [form, setForm] = React.useState({});
  const [editId, setEditId] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get(cfg.list, { auth: false });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      notify(e.message, true);
    }
  }, [cfg, notify]);

  React.useEffect(() => { load(); }, [load]);

  const reset = () => { setForm({}); setEditId(null); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (id === 'interest-groups' && payload.department === '') delete payload.department;
      if (editId) await api.put(cfg.write(editId), payload);
      else await api.post(cfg.write(), payload);
      notify(editId ? 'Updated.' : 'Created.');
      reset();
      load();
    } catch (e2) {
      notify(e2.message, true);
    }
  };

  const remove = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.del(cfg.write(itemId));
      notify('Deleted.');
      load();
    } catch (e) {
      notify(e.message, true);
    }
  };

  const titleOf = (it) => it.name || it.title || it.slug || it._id;

  return (
    <div>
      {cfg.hint && <p className="text-[11px] text-text-tertiary mb-3">{cfg.hint}</p>}
      <div className="divide-y divide-border-subtle mb-4">
        {items.map((it) => (
          <div key={it._id} className="flex items-center gap-3 py-2">
            {(it.imageUrl || it.bannerImageUrl) && (
              <img src={resolveImg(it.imageUrl || it.bannerImageUrl)} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary truncate">{titleOf(it)}</p>
              <p className="text-[11px] text-text-tertiary truncate">
                {it.role || it.slug || it.areaOfInterest || it.email || ''}
                {it.igl?.name ? ` · lead: ${it.igl.name}` : ''}
              </p>
            </div>
            <GhostButton className="!px-2.5 !py-1 !text-xs" onClick={() => { setEditId(it._id); setForm(it); }}>
              Edit
            </GhostButton>
            <DangerButton onClick={() => remove(it._id)}>Delete</DangerButton>
          </div>
        ))}
        {items.length === 0 && <Empty title="Nothing here yet" hint="Add the first item below." />}
      </div>

      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-bg-primary border border-border-color">
        {cfg.fields.map((f) => (
          <div key={f.k} className={f.t === 'textarea' || f.t === 'image' ? 'sm:col-span-2' : ''}>
            <Field label={`${f.label}${f.req ? ' *' : ''}`}>
              <FieldInput f={f} value={form[f.k]} depts={depts} experts={experts} onChange={(v) => setForm({ ...form, [f.k]: v })} />
            </Field>
          </div>
        ))}
        <div className="sm:col-span-2 flex gap-2">
          <PrimaryButton type="submit" className="!text-xs">{editId ? 'Save changes' : 'Add item'}</PrimaryButton>
          {editId && <GhostButton type="button" className="!text-xs" onClick={reset}>Cancel</GhostButton>}
        </div>
      </form>
    </div>
  );
}

function MessagesCard({ notify }) {
  const [msgs, setMsgs] = React.useState({ sponsor: null, chairman: null });

  const load = React.useCallback(async () => {
    const data = await api.get('/public/messages', { auth: false });
    const map = {};
    (Array.isArray(data) ? data : []).forEach((m) => { map[m.role] = m; });
    setMsgs({ sponsor: map.sponsor || null, chairman: map.chairman || null });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const save = async (role) => {
    const m = msgs[role];
    if (!m) return;
    try {
      await api.put(`/admin/messages/${role}`, { name: m.name, content: m.content, imageUrl: m.imageUrl });
      notify('Message saved.');
      load();
    } catch (e) {
      notify(e.message, true);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {['sponsor', 'chairman'].map((role) => (
        <div key={role} className="p-3 rounded-xl bg-bg-primary border border-border-color space-y-2.5">
          <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
            {role === 'sponsor' ? 'Faculty sponsor' : 'Student chairman'}
          </p>
          <Field label="Name">
            <TextInput value={msgs[role]?.name || ''} onChange={(e) => setMsgs({ ...msgs, [role]: { ...msgs[role], name: e.target.value } })} />
          </Field>
          <Field label="Message">
            <TextArea rows="3" value={msgs[role]?.content || ''} onChange={(e) => setMsgs({ ...msgs, [role]: { ...msgs[role], content: e.target.value } })} />
          </Field>
          <ImageField label="Photo" value={msgs[role]?.imageUrl || ''} onChange={(v) => setMsgs({ ...msgs, [role]: { ...msgs[role], imageUrl: v } })} />
          <PrimaryButton className="!text-xs" onClick={() => save(role)}>Save</PrimaryButton>
        </div>
      ))}
    </div>
  );
}

export default function ContentSection() {
  const { user } = useAuth();
  const [entity, setEntity] = React.useState('carousel');
  const [depts, setDepts] = React.useState([]);
  const [experts, setExperts] = React.useState([]);
  const [err, setErr] = React.useState('');
  const [msg, setMsg] = React.useState('');

  const notify = React.useCallback((text, isErr = false) => {
    if (isErr) setErr(text);
    else setMsg(text);
    setTimeout(() => { setErr(''); setMsg(''); }, 3500);
  }, []);

  React.useEffect(() => {
    api.get('/public/departments', { auth: false }).then((d) => setDepts(Array.isArray(d) ? d : [])).catch(() => {});
    api.get('/v1/users?role=expert&limit=100').then((d) => setExperts(d.items || [])).catch(() => {});
  }, []);

  const canContent = ['chair', 'vice_chair', 'secretary', 'treasurer', 'hod'].includes(user.role);

  return (
    <div className="space-y-5">
      <ErrorNote message={err} />
      <SuccessNote message={msg} />

      <Card>
        <SectionTitle hint="Hero slides, departments and interest groups — people come from accounts">Site content</SectionTitle>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {Object.entries(ENTITIES).map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => setEntity(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                entity === id ? 'bg-acm-blue text-white' : 'border border-border-color text-text-secondary hover:text-text-primary'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        {canContent || entity === 'interest-groups' ? (
          <EntityManager id={entity} depts={depts} experts={experts} notify={notify} />
        ) : (
          <Empty title="Restricted" hint="Only exec and HoDs manage this section." />
        )}
      </Card>

      {canContent && (
        <Card>
          <SectionTitle hint="Homepage leadership messages">Chapter messages</SectionTitle>
          <MessagesCard notify={notify} />
        </Card>
      )}
    </div>
  );
}
