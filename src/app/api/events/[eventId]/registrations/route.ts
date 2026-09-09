import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError } from "@/lib/api";
import type { RegistrationStatus } from "@prisma/client";

type Params = { params: Promise<{ eventId: string }> };

const VALID_STATUSES: RegistrationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { eventId } = await params;
    const statusParam = request.nextUrl.searchParams.get("status");

    const status =
      statusParam && VALID_STATUSES.includes(statusParam as RegistrationStatus)
        ? (statusParam as RegistrationStatus)
        : undefined;

    const registrations = await prisma.registration.findMany({
      where: { eventId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        ticket: {
          include: { attendance: true },
        },
      },
    });

    return NextResponse.json({ registrations });
  } catch (error) {
    return handleApiError(error);
  }
}
