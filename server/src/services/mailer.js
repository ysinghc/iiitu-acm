/**
 * Outgoing mail.
 *
 * Two sinks:
 *   1. email.txt log file — ALWAYS written. Every notification is recorded
 *      here with timestamp, recipient, subject and body. No exceptions.
 *   2. Real SMTP delivery — ONLY when EMAIL_SEND_ENABLED=true AND valid
 *      SMTP settings exist. Until then the platform is send-safe by default:
 *      nothing ever leaves the server.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

const isMailConfigured = () => Boolean(env.smtp.host && env.smtp.user);
const isSendEnabled = () => env.emailSendEnabled === true && isMailConfigured();

function shell(title, rowsHtml, cta = null) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1c1c1e">
    <div style="background:#0051a8;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
      <strong>IIITU ACM Student Chapter</strong>
    </div>
    <div style="border:1px solid #e5e5ea;border-top:none;padding:20px;border-radius:0 0 10px 10px">
      <h2 style="margin:0 0 8px;font-size:18px">${title}</h2>
      ${rowsHtml}
      ${
        cta
          ? `<p style="margin:20px 0 0"><a href="${cta.href}" style="background:#0071e3;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${cta.label}</a></p>`
          : ''
      }
      <p style="color:#8e8e93;font-size:12px;margin:20px 0 0">You received this because you are part of the IIITU ACM chapter workflow.</p>
    </div>
  </div>`;
}

const row = (k, v) => `<p style="margin:6px 0;font-size:14px"><strong>${k}:</strong> ${v || '—'}</p>`;
const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const htmlToText = (html = '') =>
  String(html)
    // Keep link targets visible: <a href="URL">text</a> -> "text (URL)"
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const Templates = {
  invite: (name, email, password) =>
    shell(`Welcome to IIITU ACM, ${esc(name)}`, `
      ${row('Login email', esc(email))}
      ${row('Temporary password', esc(password))}
      <p style="font-size:14px">Sign in and change your password from your profile.</p>`),

  eventSubmitted: (title, by) =>
    shell('New event awaiting review', `
      ${row('Event', esc(title))}
      ${row('Proposed by', esc(by))}`),

  eventDecision: (title, decision, note) =>
    shell(`Event ${esc(decision)}: ${esc(title)}`, `
      ${row('Decision', esc(decision))}
      ${note ? row('Note', esc(note)) : ''}`),

  reportNeedsSignature: (student, month, mentor) =>
    shell('Monthly progress report needs your signature', `
      ${row('Student', esc(student))}
      ${row('Month', esc(month))}
      ${row('Mentor', esc(mentor))}
      <p style="font-size:14px">Your mentor has filed KPIs for all four weeks. Please review and sign.</p>`),

  reportNeedsReview: (student, month) =>
    shell('Progress report signed — HoD review needed', `
      ${row('Student', esc(student))}
      ${row('Month', esc(month))}`),

  reviewDecided: (kind, month, decision, note) =>
    shell(`${esc(kind)} ${esc(decision)} (${esc(month)})`, `
      ${row('Decision', esc(decision))}
      ${note ? row('Note', esc(note)) : ''}`),

  summaryNeedsMentor: (student, month) =>
    shell('Month-end summary awaiting your note', `
      ${row('Student', esc(student))}
      ${row('Month', esc(month))}`),

  passwordReset: (name, link) =>
    shell('Reset your IIITU ACM password', `
      ${row('Account', esc(name))}
      <p style="font-size:14px">Use the button below within 1 hour. If you did not request this, ignore this email.</p>`,
    { href: link, label: 'Reset password' }),
};

function logToFile({ to, subject, html, sent }) {
  const line = [
    '='.repeat(72),
    `at:      ${new Date().toISOString()}`,
    `to:      ${to}`,
    `subject: ${subject}`,
    `sent:    ${sent ? 'yes (smtp)' : 'no (logged only)'}`,
    '-'.repeat(72),
    htmlToText(html),
    '',
  ].join('\n');
  // Serverless filesystems (Vercel) are read-only outside /tmp — try the
  // configured file, then /tmp, then fall back to stdout (captured in
  // function logs). Never throws.
  const targets = [env.emailLogFile];
  if (process.env.VERCEL) targets.push('/tmp/email.txt');
  for (const target of targets) {
    try {
      const dir = require('path').dirname(target);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(target, `${line}\n`);
      return target;
    } catch {
      // try next target
    }
  }
  console.log(`[mail:unwritable-log]\n${line}`);
  return null;
}

async function sendMail({ to, subject, html }) {
  if (!to) return { sent: false, logged: false, reason: 'no-recipient' };
  let sent = false;
  let reason = 'logged only (EMAIL_SEND_ENABLED is not true)';
  if (isSendEnabled()) {
    try {
      await getTransporter().sendMail({ from: env.smtp.from, to, subject, html });
      sent = true;
      reason = 'sent via smtp';
    } catch (err) {
      reason = `smtp failed: ${err.message}`;
      console.error('[mail] send failed:', err.message);
    }
  } else {
    console.log(`[mail:file] to=${to} subject=${subject}`);
  }
  logToFile({ to, subject, html, sent });
  return { sent, logged: true, reason };
}

module.exports = { sendMail, Templates, isMailConfigured, isSendEnabled, htmlToText };
