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
    if (!token) {
      // No widget configured locally: let developers work without keys.
      // Production without a secret is a misconfiguration — refuse loudly.
      if (!process.env.RECAPTCHA_SECRET && process.env.NODE_ENV !== 'production') {
        console.warn('[captcha] no token and no secret — allowing in non-production');
        return next();
      }
      throw ApiError.badRequest('CAPTCHA verification required. Please complete the check and try again.');
    }
    const result = await verifyCaptcha(token, { remoteip: req.ip });
    if (!result.ok) {
      if (result.reason === 'captcha-not-configured') {
        throw new ApiError(503, 'CAPTCHA is not configured. Please contact the administrator.');
      }
      throw ApiError.forbidden('CAPTCHA verification failed. Please try again.');
    }
    next();
  });

module.exports = { requireCaptcha };
