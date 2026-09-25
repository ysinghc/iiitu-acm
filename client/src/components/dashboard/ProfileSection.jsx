import React from 'react';
import { ClipboardCopy, ShieldCheck, GraduationCap } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, SectionTitle, Field, TextInput, TextArea, PrimaryButton, ErrorNote, SuccessNote, ImageField, Badge,
} from '../ui';
import { roleLabel } from '../../utils/roles';

export default function ProfileSection() {
  const { user, setUser } = useAuth();
  const [form, setForm] = React.useState({
    name: user.name || '',
    batch: user.batch || '',
    avatarUrl: user.avatarUrl || '',
    bio: user.bio || '',
    github: user.github || '',
    linkedin: user.linkedin || '',
  });
  const [pw, setPw] = React.useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [pwMsg, setPwMsg] = React.useState('');
  const [pwErr, setPwErr] = React.useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      const data = await api.patch('/v1/auth/me', form);
      setUser(data.user);
      localStorage.setItem('acm_user', JSON.stringify(data.user));
      setMsg('Profile updated.');
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwMsg('');
    try {
      await api.post('/v1/auth/change-password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg('Password changed.');
    } catch (e2) {
      setPwErr(e2.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5 items-start">
      {/* Identity rail */}
      <Card className="card-hover">
        <div className="flex flex-col items-center text-center py-2">
          {form.avatarUrl || user.avatarUrl ? (
            <img src={form.avatarUrl || user.avatarUrl} alt={user.name}
              className="w-24 h-24 rounded-2xl object-cover border border-border-color" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-acm-blue/10 text-acm-blue flex items-center justify-center text-3xl font-extrabold">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <p className="mt-3 text-lg font-bold text-text-primary">{user.name}</p>
          <p className="text-xs text-text-secondary">{user.email}</p>
          <div className="mt-2">
            <Badge color="blue">{roleLabel(user.role)}</Badge>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-bg-primary border border-border-color">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Member ID</span>
          <span className="font-mono text-sm font-bold text-acm-blue">{user.userId || '—'}</span>
          {user.userId && (
            <button
              onClick={() => navigator.clipboard?.writeText(user.userId)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-text-tertiary hover:text-acm-blue"
            >
              <ClipboardCopy className="h-3.5 w-3.5" /> Copy
            </button>
          )}
        </div>
        {(user.batch || user.department) && (
          <p className="mt-3 text-center text-[11px] text-text-tertiary">
            {[user.batch, user.department].filter(Boolean).join(' · ')}
          </p>
        )}
      </Card>

      {/* Profile form — takes the roomy center */}
      <Card className="xl:col-span-2">
        <SectionTitle hint={`${roleLabel(user.role)} · ${user.email}`}>Your profile</SectionTitle>
        <ErrorNote message={err} />
        <SuccessNote message={msg} />
        <form onSubmit={save} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name">
              <TextInput value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Batch">
              <TextInput value={form.batch} onChange={set('batch')} placeholder="2026–30" />
            </Field>
          </div>
          <ImageField label="Profile photo (upload or URL)" value={form.avatarUrl} onChange={(v) => setForm({ ...form, avatarUrl: v })} />
          <Field label="Bio">
            <TextArea rows="3" value={form.bio} onChange={set('bio')} placeholder="A line about you…" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="GitHub">
              <TextInput value={form.github} onChange={set('github')} placeholder="username or URL" />
            </Field>
            <Field label="LinkedIn">
              <TextInput value={form.linkedin} onChange={set('linkedin')} placeholder="profile URL" />
            </Field>
          </div>
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </form>
      </Card>

      {/* Security + mentor rail — full-width spread below */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 xl:col-span-3">
        <Card>
          <SectionTitle hint="Use at least 8 characters">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Change password</span>
          </SectionTitle>
          <ErrorNote message={pwErr} />
          <SuccessNote message={pwMsg} />
          <form onSubmit={changePw} className="space-y-3.5">
            <Field label="Current password">
              <TextInput type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="New password">
              <TextInput type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <PrimaryButton type="submit">Update password</PrimaryButton>
          </form>
        </Card>

        {user.mentor && (
          <Card>
            <SectionTitle hint="Guides your monthly progress">
              <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Your mentor</span>
            </SectionTitle>
            <p className="text-sm font-semibold text-text-primary">{user.mentor.name || 'Assigned'}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
