import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api";
import { updateAdminSchema } from "@/lib/validators";
import { ADMIN_PUBLIC_SELECT, countActiveSuperAdmins } from "@/lib/admins";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Admin not found");

    if (existing.role === "SUPER_ADMIN" && parsed.data.role !== "SUPER_ADMIN") {
      const remaining = await countActiveSuperAdmins(id);
      if (remaining === 0) {
        throw new ApiError(400, "Cannot change role: at least one active super admin is required.");
      }
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        ...(parsed.data.password ? { passwordHash: await bcrypt.hash(parsed.data.password, 12) } : {}),
      },
      select: ADMIN_PUBLIC_SELECT,
    });

    return NextResponse.json({ admin });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An admin with this email already exists." }, { status: 409 });
    }
    return handleApiError(error);
  }
}

/**
 * Deactivates an admin (blocks sign-in) rather than deleting the row —
 * a hard delete would violate foreign keys on events they created,
 * registrations they reviewed, or attendance they scanned.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const currentAdmin = await requireSuperAdmin();
    const { id } = await params;

    if (id === currentAdmin.id) {
      throw new ApiError(400, "You cannot delete your own account.");
    }

    const existing = await prisma.admin.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Admin not found");

    if (existing.role === "SUPER_ADMIN" && !existing.disabledAt) {
      const remaining = await countActiveSuperAdmins(id);
      if (remaining === 0) {
        throw new ApiError(400, "Cannot delete the last active super admin.");
      }
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: { disabledAt: new Date() },
      select: ADMIN_PUBLIC_SELECT,
    });

    return NextResponse.json({ admin });
  } catch (error) {
    return handleApiError(error);
  }
}
