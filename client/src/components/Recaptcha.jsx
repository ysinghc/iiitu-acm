import React from 'react';

/**
 * Google reCAPTCHA v2 checkbox (explicit render).
 * Hands the single-use token to the parent via onToken.
 * Remount (change `key`) after every submit attempt — tokens redeem once.
 * Without VITE_RECAPTCHA_SITE_KEY it renders nothing (local dev relies on
 * the backend dev-bypass; production backend rejects missing tokens).
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

  React.useEffect(() => {
    if (!SITEKEY) return;
    let alive = true;
    loadScript().then(
      () => {
        if (!alive || !ref.current || !window.grecaptcha) return;
        try {
          idRef.current = window.grecaptcha.render(ref.current, {
            sitekey: SITEKEY,
            theme: 'auto',
            callback: (token) => cbRef.current && cbRef.current(token),
            'expired-callback': () => cbRef.current && cbRef.current(''),
            'error-callback': () => cbRef.current && cbRef.current(''),
          });
        } catch {
          // already rendered on this node (strict-mode remount) — ignore
        }
      },
      () => {}
    );
    return () => {
      alive = false;
      try {
        if (idRef.current != null && window.grecaptcha) window.grecaptcha.reset(idRef.current);
      } catch { /* already gone */ }
      idRef.current = null;
    };
  }, []);

  if (!SITEKEY) return null;
  return <div ref={ref} className="flex justify-center" />;
}
