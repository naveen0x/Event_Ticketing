import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api";

type Params = { params: Promise<{ attendanceId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { attendanceId } = await params;

    const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!attendance) throw new ApiError(404, "Attendance record not found");

    if (attendance.status === "ATTENDED") {
      return NextResponse.json({ attendance });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: "ATTENDED",
        checkedInAt: new Date(),
        scannedById: admin.id,
      },
    });

    return NextResponse.json({ attendance: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
