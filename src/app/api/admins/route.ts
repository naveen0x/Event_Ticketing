import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError } from "@/lib/api";
import { createAdminSchema } from "@/lib/validators";
import { ADMIN_PUBLIC_SELECT } from "@/lib/admins";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    await requireSuperAdmin();
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "asc" },
      select: ADMIN_PUBLIC_SELECT,
    });
    return NextResponse.json({ admins });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const admin = await prisma.admin.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
      },
      select: ADMIN_PUBLIC_SELECT,
    });

    return NextResponse.json({ admin }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An admin with this email already exists." }, { status: 409 });
    }
    return handleApiError(error);
  }
}
