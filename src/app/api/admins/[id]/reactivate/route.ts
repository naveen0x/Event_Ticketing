import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api";
import { ADMIN_PUBLIC_SELECT } from "@/lib/admins";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Admin not found");

    const admin = await prisma.admin.update({
      where: { id },
      data: { disabledAt: null },
      select: ADMIN_PUBLIC_SELECT,
    });

    return NextResponse.json({ admin });
  } catch (error) {
    return handleApiError(error);
  }
}
