import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError, requireAdmin } from "@/lib/api";
import { qrCodeDataUrl } from "@/lib/qr";
import { sendRejectionEmail } from "@/lib/email";

type Params = { params: Promise<{ ticketCode: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { ticketCode } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        attendance: true,
        registration: {
          include: { event: true },
        },
      },
    });

    if (!ticket) throw new ApiError(404, "Ticket not found");

    const qrImage = await qrCodeDataUrl(ticket.qrToken);

    return NextResponse.json({
      ticket: {
        ticketCode: ticket.ticketCode,
        qrImage,
      },
      attendance: ticket.attendance,
      attendee: {
        fullName: ticket.registration.fullName,
      },
      event: {
        title: ticket.registration.event.title,
        location: ticket.registration.event.location,
        startAt: ticket.registration.event.startAt,
        endAt: ticket.registration.event.endAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Revokes a ticket: deletes it (and its attendance record) and moves the
 * registration back to REJECTED, so the old QR code can never be used again.
 * Refuses if the attendee has already checked in.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { ticketCode } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        attendance: true,
        registration: { include: { event: true } },
      },
    });

    if (!ticket) throw new ApiError(404, "Ticket not found");
    if (ticket.attendance?.status === "ATTENDED") {
      throw new ApiError(
        400,
        "Cannot revoke a ticket that has already been used for check-in. Undo the check-in first."
      );
    }

    await prisma.$transaction([
      prisma.ticket.delete({ where: { id: ticket.id } }),
      prisma.registration.update({
        where: { id: ticket.registrationId },
        data: {
          status: "REJECTED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          rejectionReason: "Ticket revoked by admin",
        },
      }),
    ]);

    try {
      await sendRejectionEmail({
        to: ticket.registration.email,
        attendeeName: ticket.registration.fullName,
        eventTitle: ticket.registration.event.title,
        reason: "Your ticket has been revoked by the event organiser.",
      });
    } catch (emailError) {
      console.error("Failed to send ticket-revoked email:", emailError);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
