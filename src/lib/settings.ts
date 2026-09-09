import type { SmtpSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SMTP_SETTINGS_ID = "singleton";

export function getSmtpSettings() {
  return prisma.smtpSettings.findUnique({ where: { id: SMTP_SETTINGS_ID } });
}

/** Strips the password before sending settings to the client. */
export function toPublicSmtpSettings(settings: SmtpSettings) {
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    rejectUnauthorized: settings.rejectUnauthorized,
    username: settings.username,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    updatedAt: settings.updatedAt,
    updatedByEmail: settings.updatedByEmail,
    hasPassword: Boolean(settings.password),
  };
}
