import nodemailer from "nodemailer";
import { qrCodeBuffer } from "@/lib/qr";
import { formatEventDateRange } from "@/lib/format";
import { getSmtpSettings } from "@/lib/settings";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  rejectUnauthorized: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

export function buildTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
    tls: { rejectUnauthorized: config.rejectUnauthorized },
  });
}

function formatFrom(config: SmtpConfig) {
  return `"${config.fromName}" <${config.fromEmail}>`;
}

/** Loads SMTP settings saved via the admin dashboard and builds a transporter from them. */
async function getConfiguredTransporter() {
  const settings = await getSmtpSettings();
  if (!settings) {
    throw new Error(
      "SMTP is not configured. Add SMTP settings from Admin → Settings → Email."
    );
  }
  return { transporter: buildTransporter(settings), from: formatFrom(settings) };
}

type TicketEmailParams = {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventLocation?: string | null;
  startAt: Date;
  endAt?: Date | null;
  ticketCode: string;
  qrToken: string;
  ticketUrl: string;
};

export async function sendTicketEmail(params: TicketEmailParams) {
  const {
    to,
    attendeeName,
    eventTitle,
    eventLocation,
    startAt,
    endAt,
    ticketCode,
    qrToken,
    ticketUrl,
  } = params;

  const qrBuffer = await qrCodeBuffer(qrToken);
  const { transporter, from } = await getConfiguredTransporter();
  const when = formatEventDateRange(startAt, endAt ?? null);

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    <h1 style="font-size: 20px; margin-bottom: 4px;">You're confirmed 🎟️</h1>
    <p style="margin-top: 0; color: #4b5563;">Hi ${escapeHtml(attendeeName)}, your registration has been approved.</p>
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600;">${escapeHtml(eventTitle)}</p>
      <p style="margin: 0 0 4px; color: #4b5563;">${escapeHtml(when)}</p>
      ${eventLocation ? `<p style="margin: 0 0 16px; color: #4b5563;">${escapeHtml(eventLocation)}</p>` : ""}
      <div style="text-align: center; margin: 16px 0;">
        <img src="cid:ticket-qr" alt="Ticket QR code" width="220" height="220" style="display:inline-block;" />
      </div>
      <p style="text-align: center; margin: 0; font-family: monospace; letter-spacing: 1px; color: #111827;">${ticketCode}</p>
    </div>
    <p style="color: #4b5563;">Present this QR code at the entrance for check-in. You can also view your ticket online:</p>
    <p><a href="${ticketUrl}" style="color: #2563eb;">${ticketUrl}</a></p>
  </div>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Your ticket for ${eventTitle}`,
    html,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: qrBuffer,
        cid: "ticket-qr",
      },
    ],
  });
}

export async function sendRejectionEmail(params: {
  to: string;
  attendeeName: string;
  eventTitle: string;
  reason?: string | null;
}) {
  const { to, attendeeName, eventTitle, reason } = params;
  const { transporter, from } = await getConfiguredTransporter();

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
    <h1 style="font-size: 20px;">Registration update</h1>
    <p>Hi ${escapeHtml(attendeeName)}, unfortunately your registration for <strong>${escapeHtml(eventTitle)}</strong> was not approved.</p>
    ${reason ? `<p style="color: #4b5563;">Reason: ${escapeHtml(reason)}</p>` : ""}
  </div>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Update on your registration for ${eventTitle}`,
    html,
  });
}

export async function sendTestEmail(config: SmtpConfig, to: string) {
  const transporter = buildTransporter(config);
  await transporter.sendMail({
    from: formatFrom(config),
    to,
    subject: "Test email from Event Ticketing",
    html: `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <p>This is a test email from your Event Ticketing admin dashboard.</p>
      <p style="color: #4b5563;">If you received this, your SMTP settings are working correctly.</p>
    </div>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
