/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) — server side only.
 *
 * Flow per surface: widget mints a single-use token in the visitor's
 * browser -> frontend posts it as `captchaToken` -> requireCaptcha()
 * redeems it here via siteverify and requires:
 *   1. success === true
 *   2. result.hostname ∈ the deployment's frontend hostnames
 * (v2 has no per-action binding; the endpoint being hit IS the surface.)
 * Any siteverify/network failure fails CLOSED (rejects).
 *
 * Setup: RECAPTCHA_SECRET (Google Admin console, never committed),
 * RECAPTCHA_HOSTNAMES (prod frontend hosts, comma-separated).
 * Without a secret: local dev bypasses with a warning; production rejects.
 */
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

function expectedHostnames() {
  const fromEnv = (process.env.RECAPTCHA_HOSTNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return new Set(fromEnv);
  // Fallback: every origin the API itself serves (prod default is the
  // chapter domain, so www + apex are covered without extra config).
  const fromCors = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((o) => {
      try {
        return new URL(o).hostname.toLowerCase();
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  if (fromCors.length > 0) return new Set(fromCors);
  try {
    return new Set([new URL(process.env.CLIENT_URL || 'http://localhost:5173').hostname.toLowerCase()]);
  } catch {
    return new Set();
  }
}

async function verifyCaptcha(token, { remoteip } = {}) {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }
  const secret = process.env.RECAPTCHA_SECRET || '';
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'captcha-not-configured' };
    }
    console.warn('[captcha] RECAPTCHA_SECRET unset — bypassing verification in non-production');
    return { ok: true, devBypass: true };
  }

  let result;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    result = await res.json();
  } catch (err) {
    console.error('[captcha] siteverify unreachable:', err.message);
    return { ok: false, reason: 'verification-unavailable' };
  }

  if (!result || result.success !== true) {
    return { ok: false, reason: 'invalid-captcha', codes: result && result['error-codes'] };
  }
  const hosts = expectedHostnames();
  const got = String(result.hostname || '').toLowerCase();
  if (hosts.size > 0 && !hosts.has(got)) {
    return { ok: false, reason: 'hostname-mismatch' };
  }
  return { ok: true };
}

module.exports = { verifyCaptcha, expectedHostnames };
