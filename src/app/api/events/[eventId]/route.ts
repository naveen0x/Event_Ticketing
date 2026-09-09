import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!event) throw new ApiError(404, "Event not found");

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { eventId } = await params;
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw new ApiError(404, "Event not found");

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        location: parsed.data.location || null,
        startAt: parsed.data.startAt,
        endAt: parsed.data.endAt ?? null,
        capacity: parsed.data.capacity ?? null,
        registrationOpen: parsed.data.registrationOpen,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { eventId } = await params;

    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) throw new ApiError(404, "Event not found");

    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
