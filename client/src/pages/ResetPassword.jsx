import React from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, Field, TextInput, PrimaryButton, ErrorNote, SuccessNote } from '../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/v1/auth/reset-password', { token, newPassword: password }, { auth: false });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg-primary">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-bold text-text-primary tracking-tight">Set a new password</h1>
        <p className="text-xs text-text-secondary mt-1 mb-5">Minimum 8 characters. The link expires 1 hour after issue.</p>

        <ErrorNote message={error} />
        {done ? (
          <SuccessNote message="Password reset. Redirecting to sign in…" />
        ) : !token ? (
          <ErrorNote message="This reset link is missing its token. Please request a new one." />
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <Field label="New password">
              <TextInput required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <PrimaryButton type="submit" disabled={busy} className="w-full">
              {busy ? 'Please wait…' : 'Reset password'}
            </PrimaryButton>
          </form>
        )}

        <p className="mt-5 text-[11px] text-text-tertiary text-center">
          <Link to="/login" className="text-acm-blue hover:underline">← Back to sign in</Link>
        </p>
      </Card>
    </div>
  );
}
