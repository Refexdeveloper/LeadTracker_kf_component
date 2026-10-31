import nodemailer from 'nodemailer';

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
}

function getRecipients() {
  return String(process.env.REPORT_TO || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Sends the rendered HTML report via SMTP.
 * Set DRY_RUN=true to log instead of sending (useful for local testing).
 */
export async function sendReportEmail({ html, subject }) {
  const dryRun = process.env.DRY_RUN === 'true';
  const to = getRecipients();
  const from = process.env.REPORT_FROM || process.env.SMTP_USER;

  if (!to.length) {
    throw new Error('REPORT_TO is not configured. Set recipient emails in .env');
  }

  if (dryRun) {
    console.log('[DRY RUN] Email would be sent to:', to.join(', '));
    console.log('[DRY RUN] Subject:', subject);
    console.log('[DRY RUN] HTML length:', html.length, 'bytes');
    return { dryRun: true, to, subject };
  }

  const transporter = nodemailer.createTransport(getSmtpConfig());

  const info = await transporter.sendMail({
    from,
    to: to.join(', '),
    subject,
    html,
  });

  return { messageId: info.messageId, to, subject };
}
