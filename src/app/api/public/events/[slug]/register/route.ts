import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrationSchema } from "@/lib/validators";
import { ApiError, handleApiError } from "@/lib/api";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        _count: { select: { registrations: { where: { status: "APPROVED" } } } },
      },
    });

    if (!event) throw new ApiError(404, "Event not found");
    if (!event.registrationOpen) throw new ApiError(400, "Registration is closed for this event");
    if (event.capacity != null && event._count.registrations >= event.capacity) {
      throw new ApiError(400, "This event is full");
    }

    const registration = await prisma.registration.create({
      data: {
        eventId: event.id,
        fullName: parsed.data.fullName,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        organization: parsed.data.organization || null,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "You have already registered for this event with this email address." },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
