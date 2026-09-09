import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";
import { slugify } from "@/lib/slug";
import { requireAdmin, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const events = await prisma.event.findMany({
      orderBy: { startAt: "desc" },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const baseSlug = slugify(parsed.data.title) || "event";
    let slug = baseSlug;
    let attempt = 1;
    while (await prisma.event.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const event = await prisma.event.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        location: parsed.data.location || null,
        startAt: parsed.data.startAt,
        endAt: parsed.data.endAt ?? null,
        capacity: parsed.data.capacity ?? null,
        registrationOpen: parsed.data.registrationOpen,
        slug,
        createdById: user.id,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
