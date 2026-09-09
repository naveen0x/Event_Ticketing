import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api";
import { smtpSettingsSchema } from "@/lib/validators";
import { SMTP_SETTINGS_ID, getSmtpSettings, toPublicSmtpSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getSmtpSettings();

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({ settings: toPublicSmtpSettings(settings) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const parsed = smtpSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await getSmtpSettings();
    const password = parsed.data.password || existing?.password;

    if (!password) {
      throw new ApiError(400, "A password is required the first time you configure SMTP.");
    }

    const settings = await prisma.smtpSettings.upsert({
      where: { id: SMTP_SETTINGS_ID },
      create: {
        id: SMTP_SETTINGS_ID,
        host: parsed.data.host,
        port: parsed.data.port,
        secure: parsed.data.secure,
        rejectUnauthorized: parsed.data.rejectUnauthorized,
        username: parsed.data.username,
        password,
        fromName: parsed.data.fromName,
        fromEmail: parsed.data.fromEmail,
        updatedByEmail: admin.email,
      },
      update: {
        host: parsed.data.host,
        port: parsed.data.port,
        secure: parsed.data.secure,
        rejectUnauthorized: parsed.data.rejectUnauthorized,
        username: parsed.data.username,
        password,
        fromName: parsed.data.fromName,
        fromEmail: parsed.data.fromEmail,
        updatedByEmail: admin.email,
      },
    });

    return NextResponse.json({ settings: toPublicSmtpSettings(settings) });
  } catch (error) {
    return handleApiError(error);
  }
}
