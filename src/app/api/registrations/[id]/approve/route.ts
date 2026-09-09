import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";
import { generateQrToken, generateTicketCode } from "@/lib/tokens";
import { sendTicketEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: {
          include: { _count: { select: { registrations: { where: { status: "APPROVED" } } } } },
        },
        ticket: true,
      },
    });

    if (!registration) throw new ApiError(404, "Registration not found");
    if (registration.status === "APPROVED") {
      return NextResponse.json({ registration });
    }
    if (
      registration.event.capacity != null &&
      registration.event._count.registrations >= registration.event.capacity
    ) {
      throw new ApiError(400, "Event capacity has been reached");
    }

    const ticketCode = generateTicketCode();
    const qrToken = generateQrToken();

    const updated = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketCode,
          qrToken,
          registrationId: reg.id,
        },
      });

      const attendance = await tx.attendance.create({
        data: { ticketId: ticket.id },
      });

      return { reg, ticket, attendance };
    });

    const ticketUrl = `${process.env.APP_URL ?? ""}/ticket/${updated.ticket.ticketCode}`;

    try {
      await sendTicketEmail({
        to: registration.email,
        attendeeName: registration.fullName,
        eventTitle: registration.event.title,
        eventLocation: registration.event.location,
        startAt: registration.event.startAt,
        endAt: registration.event.endAt,
        ticketCode: updated.ticket.ticketCode,
        qrToken: updated.ticket.qrToken,
        ticketUrl,
      });
      await prisma.ticket.update({
        where: { id: updated.ticket.id },
        data: { emailSentAt: new Date() },
      });
    } catch (emailError) {
      console.error("Failed to send ticket email:", emailError);
    }

    return NextResponse.json({
      registration: updated.reg,
      ticket: { ...updated.ticket, attendance: updated.attendance },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
