/**
 * Route guard: redeem the reCAPTCHA token posted as `captchaToken`
 * (or `g-recaptcha-response`) BEFORE the handler runs. Handlers stay
 * untouched — this only gates them. The `action` argument is accepted
 * for future surfaces but unused: v2 binds the token to the site, and
 * the endpoint being hit is the surface.
 */
const { ApiError, asyncHandler } = require('../utils/http');
const { verifyCaptcha } = require('../services/captcha');

const requireCaptcha = (action) =>
  asyncHandler(async (req, res, next) => {
    const token = req.body?.captchaToken || req.body?.['g-recaptcha-response'];
    if (!token || (typeof token === 'string' && token.trim().length === 0)) {
      // No widget configured locally: let developers work without keys.
      // Production without a secret is a misconfiguration — refuse loudly.
      if (!process.env.RECAPTCHA_SECRET && process.env.NODE_ENV !== 'production') {
        console.warn('[captcha] no token and no secret — allowing in non-production');
        return next();
      }
      console.warn(`[captcha] ${action} blocked (empty-token: nothing received from widget)`);
      throw ApiError.badRequest('CAPTCHA verification required. Please complete the check and try again.');
    }
    const result = await verifyCaptcha(token, { remoteip: req.ip });
    if (!result.ok) {
      console.warn(`[captcha] ${action} blocked (${result.reason || 'unknown'})` +
        (result.codes ? ` codes=${JSON.stringify(result.codes)}` : ''));
      if (result.reason === 'captcha-not-configured') {
        throw new ApiError(503, 'CAPTCHA is not configured. Please contact the administrator.');
      }
      if (result.reason === 'verification-unavailable') {
        throw new ApiError(503, 'CAPTCHA verification is temporarily unavailable. Please try again.');
      }
      // In non-production, expose the reason so a 403 is debuggable
      // (hostname allowlist vs bad/expired token). Production keeps the
      // generic message to avoid leaking config details.
      if (process.env.NODE_ENV !== 'production' && result.reason) {
        throw ApiError.forbidden(`CAPTCHA verification failed (${result.reason}). Please try again.`);
      }
      throw ApiError.forbidden('CAPTCHA verification failed. Please try again.');
    }
    next();
  });

module.exports = { requireCaptcha };
