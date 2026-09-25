import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Card, Field, TextInput, PrimaryButton, ErrorNote, SuccessNote } from '../components/ui';
import Recaptcha from '../components/Recaptcha';

/**
 * Invite-only auth: there is no public signup. Accounts are created via
 * POST /v1/auth/users by exec / HoD / expert and delivered by email.
 * This page offers sign-in + forgot-password only.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('login');
  const [form, setForm] = React.useState({ email: '', password: '' });
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [captcha, setCaptcha] = React.useState('');
  const [captchaKey, setCaptchaKey] = React.useState(0);

  const siteKeyConfigured = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (siteKeyConfigured && !captcha && mode !== 'forgot') {
      // Forgot also verifies, but let the server message guide that flow.
    }
    if (siteKeyConfigured && !captcha) {
      setError('Please complete the captcha check before continuing.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await api.post('/v1/auth/forgot-password', { email: form.email.trim(), captchaToken: captcha }, { auth: false });
        setInfo('If an account exists for this email, a reset link was sent.');
      } else {
        await login(form.email.trim(), form.password, captcha);
        navigate('/dashboard');
        return;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      // Tokens redeem once — refresh the widget for any retry.
      setCaptcha('');
      setCaptchaKey((k) => k + 1);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-bg-primary">
      <Card className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <img src="/iiitu-acm.jpeg" alt="IIITU ACM" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Reset password'}
            </h1>
            <p className="text-xs text-text-secondary">IIITU ACM member portal</p>
          </div>
        </div>

        <ErrorNote message={error} />
        <SuccessNote message={info} />

        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Email">
            <TextInput required type="email" value={form.email} onChange={set('email')} placeholder="you@iiitu.ac.in" />
          </Field>
          {mode === 'login' && (
            <Field label="Password">
              <TextInput required type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            </Field>
          )}
          <Recaptcha key={`${mode}-${captchaKey}`} onToken={setCaptcha} />
          <PrimaryButton type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Send reset link'}
          </PrimaryButton>
        </form>

        <p className="mt-5 text-[11px] text-text-tertiary text-center leading-relaxed">
          {mode === 'login' ? (
            <button onClick={() => { setMode('forgot'); setError(''); setInfo(''); }} className="text-acm-blue hover:underline">
              Forgot password?
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="text-acm-blue hover:underline">
              ← Back to sign in
            </button>
          )}
          <br />
          No public signup — accounts are created by invite from the exec board, HoDs or experts.
          <br />
          <Link to="/" className="text-acm-blue hover:underline">← Back to site</Link>
        </p>
      </Card>
    </div>
  );
}
