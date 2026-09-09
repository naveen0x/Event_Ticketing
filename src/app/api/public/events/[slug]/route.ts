import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handleApiError } from "@/lib/api";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        location: true,
        startAt: true,
        endAt: true,
        capacity: true,
        registrationOpen: true,
        bannerUrl: true,
        _count: {
          select: {
            registrations: { where: { status: "APPROVED" } },
          },
        },
      },
    });

    if (!event) throw new ApiError(404, "Event not found");

    const approvedCount = event._count.registrations;
    const isFull = event.capacity != null && approvedCount >= event.capacity;

    return NextResponse.json({
      event: {
        slug: event.slug,
        title: event.title,
        description: event.description,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        bannerUrl: event.bannerUrl,
        registrationOpen: event.registrationOpen && !isFull,
        isFull,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
