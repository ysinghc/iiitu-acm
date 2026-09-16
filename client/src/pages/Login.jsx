import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { Card, Field, TextInput, Select, PrimaryButton, ErrorNote, SuccessNote } from '../components/ui';
import Recaptcha from '../components/Recaptcha';

const SIGNUP_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'scholar', label: 'Scholar (assigned a mentor)' },
  { value: 'fellow', label: 'Fellow (assigned a mentor)' },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('login');
  const [form, setForm] = React.useState({ name: '', email: '', password: '', role: 'member', department: 'engineering', batch: '' });
  const [depts, setDepts] = React.useState([]);
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [captcha, setCaptcha] = React.useState('');
  const [captchaKey, setCaptchaKey] = React.useState(0);

  React.useEffect(() => {
    api.get('/public/departments', { auth: false })
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setDepts(d);
          setForm((f) => (d.some((x) => x.slug === f.department) ? f : { ...f, department: d[0].slug }));
        }
      })
      .catch(() => {});
  }, []);

  const deptOptions = depts.length > 0
    ? depts
    : [{ slug: 'engineering', name: 'Engineering' }, { slug: 'research', name: 'Research' }];

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await api.post('/v1/auth/forgot-password', { email: form.email.trim(), captchaToken: captcha }, { auth: false });
        setInfo('If an account exists for this email, a reset link was sent.');
      } else if (mode === 'login') {
        await login(form.email.trim(), form.password, captcha);
        navigate('/dashboard');
        return;
      } else {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          department: form.role === 'member' ? '' : form.department,
          batch: form.batch.trim(),
          captchaToken: captcha,
        });
      }
      navigate('/dashboard');
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
            {mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset password' : 'Join the chapter'}
          </h1>
            <p className="text-xs text-text-secondary">IIITU ACM member portal</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 mb-5 rounded-xl bg-bg-primary border border-border-color">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                mode === m ? 'bg-bg-secondary shadow-sm text-acm-blue' : 'text-text-secondary'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <ErrorNote message={error} />
        <SuccessNote message={info} />

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'register' && (
            <Field label="Full name">
              <TextInput required value={form.name} onChange={set('name')} placeholder="Aarav Sharma" />
            </Field>
          )}
          <Field label="Email">
            <TextInput required type="email" value={form.email} onChange={set('email')} placeholder="you@iiitu.ac.in" />
          </Field>
          {mode !== 'forgot' && (
            <Field label="Password" hint={mode === 'register' ? 'Minimum 8 characters' : ''}>
              <TextInput required type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
            </Field>
          )}
          {mode === 'register' && (
            <>
              <Field label="I am joining as">
                <Select value={form.role} onChange={set('role')}>
                  {SIGNUP_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </Field>
              {form.role !== 'member' && (
                <Field label="Department">
                  <Select value={form.department} onChange={set('department')}>
                    {deptOptions.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Batch (optional)">
                <TextInput value={form.batch} onChange={set('batch')} placeholder="2026–30" />
              </Field>
            </>
          )}
          <Recaptcha key={`${mode}-${captchaKey}`} onToken={setCaptcha} />
          <PrimaryButton type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create account'}
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
          Exec board, HoDs and experts receive their accounts by invite.
          <br />
          <Link to="/" className="text-acm-blue hover:underline">← Back to site</Link>
        </p>
      </Card>
    </div>
  );
}
