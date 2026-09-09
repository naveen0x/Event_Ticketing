import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";
import { z } from "zod";

const scanSchema = z.object({
  token: z.string().trim().min(10),
  eventId: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid QR data" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrToken: parsed.data.token },
      include: {
        attendance: true,
        registration: {
          include: { event: true },
        },
      },
    });

    if (!ticket) throw new ApiError(404, "Ticket not found. This QR code is not valid.");

    if (ticket.registration.status !== "APPROVED") {
      throw new ApiError(400, "This registration is not approved.");
    }

    if (parsed.data.eventId && ticket.registration.eventId !== parsed.data.eventId) {
      throw new ApiError(400, "This ticket belongs to a different event.");
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
      },
      attendance: ticket.attendance,
      registration: {
        id: ticket.registration.id,
        fullName: ticket.registration.fullName,
        email: ticket.registration.email,
        organization: ticket.registration.organization,
      },
      event: {
        id: ticket.registration.event.id,
        title: ticket.registration.event.title,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
