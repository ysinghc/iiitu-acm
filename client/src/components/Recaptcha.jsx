import React from 'react';

/**
 * Google reCAPTCHA v2 checkbox (explicit render).
 * Hands the single-use token to the parent via onToken.
 * Remount (change `key`) after every submit attempt — tokens redeem once.
 * Renders a configuration warning when VITE_RECAPTCHA_SITE_KEY is missing
 * instead of silently rendering nothing (which previously caused confusing
 * "CAPTCHA verification required" errors on login).
 */
const SITEKEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

let scriptPromise = null;
function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve();
    window.__recaptchaOnload = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnload&render=explicit';
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error('captcha script failed'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function Recaptcha({ onToken }) {
  const ref = React.useRef(null);
  const idRef = React.useRef(null);
  const cbRef = React.useRef(onToken);
  cbRef.current = onToken;
  const [loadError, setLoadError] = React.useState('');

  React.useEffect(() => {
    if (!SITEKEY) return;
    let alive = true;
    loadScript().then(
      () => {
        if (!alive || !ref.current || !window.grecaptcha) return;
        try {
          // Skip re-render if this node was already claimed (StrictMode remount).
          if (ref.current.dataset.rendered === '1') return;
          idRef.current = window.grecaptcha.render(ref.current, {
            sitekey: SITEKEY,
            theme: 'light',
            callback: (token) => cbRef.current && cbRef.current(token),
            'expired-callback': () => cbRef.current && cbRef.current(''),
            'error-callback': () => cbRef.current && cbRef.current(''),
          });
          ref.current.dataset.rendered = '1';
        } catch {
          // already rendered on this node (strict-mode remount) — ignore
        }
      },
      () => { if (alive) setLoadError('Captcha failed to load. Check your connection and reload.'); }
    );
    return () => {
      alive = false;
      try {
        if (idRef.current != null && window.grecaptcha) window.grecaptcha.reset(idRef.current);
      } catch { /* already gone */ }
      idRef.current = null;
    };
  }, []);

  if (!SITEKEY) {
    return (
      <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
        Captcha is not configured. Please contact the administrator.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={ref} className="flex justify-center" />
      {loadError && <p className="text-[11px] text-red-500">{loadError}</p>}
    </div>
  );
}
