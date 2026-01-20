import nodemailer from 'nodemailer';
import env from '../config/env.js';
import {
  buildOrderConfirmationEmail,
  buildTechnicianAssignedEmail,
  buildOrderRescheduledEmail,
  buildInvoiceEmail
} from './email-templates.js';

let transporter;

function ensureTransporter() {
  if (transporter) return transporter;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    // eslint-disable-next-line no-console
    console.warn('[Email] SMTP environment variables are not fully configured. Emails will not be sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });

  return transporter;
}

function buildPasswordResetEmail({ name, to, resetUrl }) {
  const safeName = name || 'there';
  const subject = 'Fixzep - Reset your password';
  const text = `Hi ${safeName},\n\nWe received a request to reset your Fixzep account password.\n\nYou can set a new password by clicking the link below:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nThis link will expire in 60 minutes.\n\nThanks,\nThe Fixzep Team`;

  const html = `
  <div style="background-color:#f5f5f7;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);" cellspacing="0" cellpadding="0" role="presentation">
            <tr>
              <td style="padding:24px 32px 16px 32px;border-bottom:1px solid #e5e7eb;">
                <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">Fixzep</h1>
                <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;">Smart field service, made simple.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <p style="margin:0 0 12px 0;font-size:15px;color:#111827;">Hi ${safeName},</p>
                <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;line-height:1.6;">
                  We received a request to reset the password for your Fixzep account.
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;color:#4b5563;line-height:1.6;">
                  Click the button below to choose a new password. This link is valid for the next <strong>60 minutes</strong>.
                </p>
                <p style="margin:0 0 32px 0;text-align:center;">
                  <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 20px;border-radius:999px;font-size:14px;font-weight:600;text-decoration:none;">Reset password</a>
                </p>
                <p style="margin:0 0 12px 0;font-size:13px;color:#6b7280;line-height:1.6;">
                  If the button above does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;color:#9ca3af;word-break:break-all;">${resetUrl}</p>
                <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                  If you did not request this change, you can safely ignore this email and your password will remain the same.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 4px 0;font-size:12px;color:#9ca3af;">Thanks,</p>
                <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">The Fixzep Team</p>
                <p style="margin:0;font-size:11px;color:#d1d5db;">This is an automated message, please do not reply.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  return { to, subject, text, html };
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const tx = ensureTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.warn('[Email] Skipping password reset email send because transporter is not configured');
    return;
  }

  const message = buildPasswordResetEmail({ to, name, resetUrl });
  await tx.sendMail({
    from: `Fixzep <${env.smtpFrom}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
}

export async function sendOrderConfirmationEmail({ order, customerName, customerEmail }) {
  const tx = ensureTransporter();
  if (!tx || !customerEmail) {
    if (!customerEmail) {
      // eslint-disable-next-line no-console
      console.warn(`[Email] Skipping order confirmation email - customer email not available for order ${order._id}`);
    }
    return;
  }

  try {
    const message = buildOrderConfirmationEmail({ order, customerName, customerEmail });
    await tx.sendMail({
      from: `Fixzep <${env.smtpFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    // eslint-disable-next-line no-console
    console.log(`[Email] Order confirmation email sent to ${customerEmail} for order ${order.orderCode || order._id}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Email] Failed to send order confirmation email to ${customerEmail}:`, error.message);
  }
}

export async function sendTechnicianAssignedEmail({ order, technician, customerName, customerEmail }) {
  const tx = ensureTransporter();
  if (!tx || !customerEmail) {
    if (!customerEmail) {
      // eslint-disable-next-line no-console
      console.warn(`[Email] Skipping technician assigned email - customer email not available for order ${order._id}`);
    }
    return;
  }

  try {
    const message = buildTechnicianAssignedEmail({ order, technician, customerName, customerEmail });
    await tx.sendMail({
      from: `Fixzep <${env.smtpFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    // eslint-disable-next-line no-console
    console.log(`[Email] Technician assigned email sent to ${customerEmail} for order ${order.orderCode || order._id}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Email] Failed to send technician assigned email to ${customerEmail}:`, error.message);
  }
}

export async function sendOrderRescheduledEmail({ order, newStart, newEnd, customerName, customerEmail, reason }) {
  const tx = ensureTransporter();
  if (!tx || !customerEmail) {
    if (!customerEmail) {
      // eslint-disable-next-line no-console
      console.warn(`[Email] Skipping order rescheduled email - customer email not available for order ${order._id}`);
    }
    return;
  }

  try {
    const message = buildOrderRescheduledEmail({ order, newStart, newEnd, customerName, customerEmail, reason });
    await tx.sendMail({
      from: `Fixzep <${env.smtpFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    // eslint-disable-next-line no-console
    console.log(`[Email] Order rescheduled email sent to ${customerEmail} for order ${order.orderCode || order._id}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Email] Failed to send order rescheduled email to ${customerEmail}:`, error.message);
  }
}

export async function sendInvoiceEmail({ order, jobCard, payment, customerName, customerEmail }) {
  const tx = ensureTransporter();
  if (!tx || !customerEmail) {
    if (!customerEmail) {
      // eslint-disable-next-line no-console
      console.warn(`[Email] Skipping invoice email - customer email not available for order ${order._id}`);
    }
    return;
  }

  try {
    const message = buildInvoiceEmail({ order, jobCard, payment, customerName, customerEmail });
    await tx.sendMail({
      from: `Fixzep <${env.smtpFrom}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    // eslint-disable-next-line no-console
    console.log(`[Email] Invoice email sent to ${customerEmail} for order ${order.orderCode || order._id}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Email] Failed to send invoice email to ${customerEmail}:`, error.message);
  }
}
