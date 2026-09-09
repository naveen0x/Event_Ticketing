import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";
import { rejectSchema } from "@/lib/validators";
import { sendRejectionEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    const reason = parsed.success ? parsed.data.reason || null : null;

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!registration) throw new ApiError(404, "Registration not found");

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    try {
      await sendRejectionEmail({
        to: registration.email,
        attendeeName: registration.fullName,
        eventTitle: registration.event.title,
        reason,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    return NextResponse.json({ registration: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
