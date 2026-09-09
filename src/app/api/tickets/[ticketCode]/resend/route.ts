import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireAdmin } from "@/lib/api";
import { sendTicketEmail } from "@/lib/email";

type Params = { params: Promise<{ ticketCode: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { ticketCode } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
      include: { registration: { include: { event: true } } },
    });

    if (!ticket) throw new ApiError(404, "Ticket not found");
    if (ticket.registration.status !== "APPROVED") {
      throw new ApiError(400, "Registration is not approved");
    }

    const ticketUrl = `${process.env.APP_URL ?? ""}/ticket/${ticket.ticketCode}`;

    await sendTicketEmail({
      to: ticket.registration.email,
      attendeeName: ticket.registration.fullName,
      eventTitle: ticket.registration.event.title,
      eventLocation: ticket.registration.event.location,
      startAt: ticket.registration.event.startAt,
      endAt: ticket.registration.event.endAt,
      ticketCode: ticket.ticketCode,
      qrToken: ticket.qrToken,
      ticketUrl,
    });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { emailSentAt: new Date() },
    });

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: `Failed to send email: ${error.message}` }, { status: 502 });
    }
    return handleApiError(error);
  }
}
