import React from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Card, SectionTitle, Field, TextInput, TextArea, PrimaryButton, ErrorNote, SuccessNote, ImageField,
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <SectionTitle hint={`${roleLabel(user.role)} · ${user.email}`}>Your profile</SectionTitle>
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-bg-primary border border-border-color">
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Member ID</span>
          <span className="font-mono text-sm font-bold text-acm-blue">{user.userId || '—'}</span>
          {user.userId && (
            <button
              onClick={() => navigator.clipboard?.writeText(user.userId)}
              className="ml-auto text-[11px] font-bold text-text-tertiary hover:text-acm-blue"
            >
              Copy
            </button>
          )}
        </div>
        <ErrorNote message={err} />
        <SuccessNote message={msg} />
        <form onSubmit={save} className="space-y-3.5">
          <Field label="Full name">
            <TextInput value={form.name} onChange={set('name')} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Batch">
              <TextInput value={form.batch} onChange={set('batch')} placeholder="2026–30" />
            </Field>
            <Field label="LinkedIn">
              <TextInput value={form.linkedin} onChange={set('linkedin')} placeholder="profile URL" />
            </Field>
          </div>
          <ImageField label="Profile photo (upload or URL)" value={form.avatarUrl} onChange={(v) => setForm({ ...form, avatarUrl: v })} />
          <Field label="Bio">
            <TextArea rows="3" value={form.bio} onChange={set('bio')} placeholder="A line about you…" />
          </Field>
          <Field label="GitHub">
            <TextInput value={form.github} onChange={set('github')} placeholder="username or URL" />
          </Field>
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </form>
      </Card>

      <Card>
        <SectionTitle hint="Use at least 8 characters">Change password</SectionTitle>
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

        {user.mentor && (
          <div className="mt-6 pt-5 border-t border-border-subtle">
            <SectionTitle hint="Guides your monthly progress">Your mentor</SectionTitle>
            <p className="text-sm font-semibold text-text-primary">{user.mentor.name || 'Assigned'}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
