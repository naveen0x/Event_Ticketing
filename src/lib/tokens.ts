import { randomBytes } from "crypto";

/** Human-readable, display-friendly ticket identifier, e.g. TCK-9F2A7C1B */
export function generateTicketCode(): string {
  const chunk = randomBytes(5).toString("hex").toUpperCase();
  return `TCK-${chunk}`;
}

/** Opaque, unguessable bearer token embedded in the QR code and used to look up a ticket. */
export function generateQrToken(): string {
  return randomBytes(32).toString("base64url");
}
