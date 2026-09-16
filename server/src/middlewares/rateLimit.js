/**
 * Rate limiting.
 *
 * Identity model: auth endpoints are keyed by the account identifier in the
 * request body (email, or username on the legacy login) so brute force
 * against ONE account can't be spread out — while other users behind the
 * same IP are unaffected. Everything else falls back to IP.
 *
 * NOTE (serverless): the default in-memory store is per-instance, so on
 * Vercel these limits are approximate under concurrency. For strict global
 * enforcement, swap `store` for a Redis/Upstash store.
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const MINUTE = 60 * 1000;

/** Account identifier from the body (email preferred, legacy username accepted). */
const emailKey = (req) => {
  const raw = req.body?.email || req.body?.username || '';
  const id = String(raw).trim().toLowerCase();
  return id || ipKeyGenerator(req.ip);
};

/** Authenticated user when the chain already ran auth, else IP. */
const userKey = (req) => {
  const id = req.auth?.userId || (req.user && String(req.user._id));
  return id || ipKeyGenerator(req.ip);
};

/** 429 shape readable by both v1 ({ error }) and legacy ({ message }) clients. */
const tooMany = (message) => (req, res) => {
  res.status(429).json({ error: { message }, message });
};

const common = { standardHeaders: true, legacyHeaders: false };

// Sign-in: 10 failures / 15 min per account. Successful logins don't count.
const loginLimiter = rateLimit({
  ...common,
  windowMs: num(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * MINUTE),
  limit: num(process.env.RATE_LIMIT_AUTH_MAX, 10),
  keyGenerator: emailKey,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many sign-in attempts for this account. Try again in 15 minutes.'),
});

// Registration: 10 / hour per email (one email registers once anyway).
const registerLimiter = rateLimit({
  ...common,
  windowMs: num(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 60 * MINUTE),
  limit: num(process.env.RATE_LIMIT_REGISTER_MAX, 10),
  keyGenerator: emailKey,
  handler: tooMany('Too many signups from this address. Try again later.'),
});

// Forgot-password: 5 / 15 min per email (endpoint always 200s, so no skip).
const forgotLimiter = rateLimit({
  ...common,
  windowMs: num(process.env.RATE_LIMIT_FORGOT_WINDOW_MS, 15 * MINUTE),
  limit: num(process.env.RATE_LIMIT_FORGOT_MAX, 5),
  keyGenerator: emailKey,
  handler: tooMany('Too many reset requests for this email. Try again in 15 minutes.'),
});

// Reset-password: 10 / 15 min per IP (token is in the body, no email yet).
const resetLimiter = rateLimit({
  ...common,
  windowMs: 15 * MINUTE,
  limit: 10,
  handler: tooMany('Too many password resets. Try again later.'),
});

// Global flood guard: generous, IP-keyed, runs before all routes.
const apiLimiter = rateLimit({
  ...common,
  windowMs: num(process.env.RATE_LIMIT_API_WINDOW_MS, 15 * MINUTE),
  limit: num(process.env.RATE_LIMIT_API_MAX, 2000),
  handler: tooMany('Too many requests. Slow down and try again.'),
});

// Uploads are expensive: 30 / hour per account (IP fallback pre-auth edge).
const uploadLimiter = rateLimit({
  ...common,
  windowMs: 60 * MINUTE,
  limit: 30,
  keyGenerator: userKey,
  handler: tooMany('Upload limit reached. Try again in an hour.'),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotLimiter,
  resetLimiter,
  apiLimiter,
  uploadLimiter,
};
