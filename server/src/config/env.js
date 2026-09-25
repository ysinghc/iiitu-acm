/**
 * Validated environment access. Fails fast with a clear message
 * instead of cryptic runtime errors deep in a request handler.
 */
require('dotenv').config();

const pick = (key, fallback = undefined) => {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return value;
};

const env = {
  nodeEnv: pick('NODE_ENV', 'development'),
  port: Number(pick('PORT', 5000)),
  mongoUri: pick('MONGODB_URI', ''),
  jwtSecret: pick('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: pick('JWT_EXPIRES_IN', '8h'),
  // Trailing slashes break exact origin matching and double up link paths.
  clientUrl: (pick('CLIENT_URL', 'http://localhost:5173') || '').replace(/\/+$/, ''),

  // Outgoing mail (SMTP). When absent, mailer logs instead of sending.
  smtp: {
    host: pick('SMTP_HOST', ''),
    port: Number(pick('SMTP_PORT', 587)),
    secure: pick('SMTP_SECURE', 'false') === 'true',
    user: pick('SMTP_USER', ''),
    pass: pick('SMTP_PASS', ''),
    from: pick('MAIL_FROM', 'IIITU ACM <no-reply@acmiiitu.in>'),
  },
  // Every email is ALWAYS appended to this file. Real SMTP delivery happens
  // only when EMAIL_SEND_ENABLED=true (safety switch for mock/staging envs).
  emailLogFile: pick('EMAIL_LOG_FILE', require('path').join(__dirname, '..', '..', 'email.txt')),
  emailSendEnabled: pick('EMAIL_SEND_ENABLED', 'false') === 'true',

  // Bootstrap chair account created when the users collection is empty.
  seedChairEmail: pick('SEED_CHAIR_EMAIL', 'chair@acmiiitu.in'),
  seedChairPassword: pick('SEED_CHAIR_PASSWORD', ''),
  seedChairName: pick('SEED_CHAIR_NAME', 'Chapter Chair'),

  cloudinaryUrl: pick('CLOUDINARY_URL', ''),
};

module.exports = env;
