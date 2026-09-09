import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Permanently deletes a rejected registration. Refuses for any other status. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const registration = await prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new ApiError(404, "Registration not found");
    if (registration.status !== "REJECTED") {
      throw new ApiError(400, "Only rejected registrations can be deleted.");
    }

    await prisma.registration.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
