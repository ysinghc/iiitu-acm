import React from 'react';
import { uploadImage } from '../utils/api';

/** Minimal shared primitives — one visual language, no clutter. */

export function Page({ title, subtitle, action, children }) {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 md:py-10 animate-fade-up">
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            {title && <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-card-bg border border-border-color rounded-2xl p-5 md:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">{children}</h2>
      {hint && <p className="text-xs text-text-secondary mt-0.5">{hint}</p>}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-text-tertiary mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2 border border-border-color rounded-xl bg-bg-primary text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-acm-blue/30 focus:border-acm-blue transition-all';

export function TextInput(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Select(props) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-xl bg-acm-blue hover:bg-acm-dark text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-elevated text-sm font-semibold transition-all disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all ${className}`}
    >
      {children}
    </button>
  );
}

const badgeColors = {
  blue: 'bg-acm-blue/10 text-acm-blue border-acm-blue/20',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/20',
  gray: 'bg-bg-elevated text-text-secondary border-border-color',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export function Badge({ color = 'gray', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeColors[color] || badgeColors.gray}`}>
      {children}
    </span>
  );
}

export function statusColor(status = '') {
  if (['published', 'approved', 'completed'].includes(status)) return 'green';
  if (['pending_review', 'pending_student', 'pending_mentor', 'pending_hod'].includes(status)) return 'amber';
  if (['rejected', 'cancelled'].includes(status)) return 'red';
  if (status === 'changes_requested') return 'purple';
  return 'gray';
}

export function Empty({ title, hint }) {
  return (
    <div className="text-center py-10 border border-dashed border-border-color rounded-2xl">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {hint && <p className="text-xs text-text-secondary mt-1">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-12 gap-3">
      <div className="w-5 h-5 border-2 border-acm-blue border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}

/**
 * Public-site page chrome — mirrors the Verticals page so every tab
 * shares one visual language: a full-bleed band header (kicker + title
 * + description + optional action) over a wide, airy content area.
 */
export function SiteHeader({ kicker, title, desc, action, children }) {
  return (
    <div className="bg-bg-secondary border-b border-border-color">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-12">
        {kicker && <span className="acm-tag">{kicker}</span>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {title && (
              <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-text-primary">{title}</h1>
            )}
            {desc && (
              <p className="mt-2 text-text-secondary text-sm max-w-md leading-relaxed">{desc}</p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}

export function SiteBody({ children, className = '' }) {
  return (
    <div className={`flex-1 max-w-7xl w-full mx-auto px-6 md:px-8 py-8 md:py-12 ${className}`}>
      {children}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium">
      {message}
    </div>
  );
}

export function SuccessNote({ message }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600 dark:text-green-400 text-xs font-medium">
      {message}
    </div>
  );
}

/** Compact image field: file upload (via /api/admin/upload) or paste URL. */
export function ImageField({ value, onChange, label = 'Banner image' }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const pick = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Field label={label}>
        <div className="flex gap-2">
          <TextInput
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload a file"
          />
          <label className="flex-shrink-0 px-3 py-2 rounded-xl border border-border-color text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated cursor-pointer transition-all">
            {busy ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              disabled={busy}
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </label>
        </div>
      </Field>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
      {value && (
        <img src={value} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-border-color" />
      )}
    </div>
  );
}
