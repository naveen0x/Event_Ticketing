import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guestSchema } from "@/lib/validators";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";
import { generateQrToken, generateTicketCode } from "@/lib/tokens";
import { sendGuestInvitationEmail } from "@/lib/email";

type Params = { params: Promise<{ eventId: string }> };

/**
 * Adds a guest directly from the dashboard. Guests skip the approval queue
 * (and the public form's open/capacity checks): they're approved, issued a
 * ticket, and emailed an invitation in one step.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { eventId } = await params;
    const body = await request.json();
    const parsed = guestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiError(404, "Event not found");

    const created = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.create({
        data: {
          eventId: event.id,
          fullName: parsed.data.fullName,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone,
          notes: parsed.data.notes || null,
          isGuest: true,
          status: "APPROVED",
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          ticketCode: generateTicketCode(),
          qrToken: generateQrToken(),
          registrationId: reg.id,
        },
      });

      const attendance = await tx.attendance.create({
        data: { ticketId: ticket.id },
      });

      return { reg, ticket, attendance };
    });

    const ticketUrl = `${process.env.APP_URL ?? ""}/ticket/${created.ticket.ticketCode}`;
    let emailSent = false;

    try {
      await sendGuestInvitationEmail({
        to: created.reg.email,
        attendeeName: created.reg.fullName,
        eventTitle: event.title,
        eventLocation: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        ticketCode: created.ticket.ticketCode,
        qrToken: created.ticket.qrToken,
        ticketUrl,
      });
      created.ticket = await prisma.ticket.update({
        where: { id: created.ticket.id },
        data: { emailSentAt: new Date() },
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send guest invitation email:", emailError);
    }

    return NextResponse.json(
      {
        registration: {
          ...created.reg,
          ticket: { ...created.ticket, attendance: created.attendance },
        },
        emailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This email address is already registered for this event." },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
