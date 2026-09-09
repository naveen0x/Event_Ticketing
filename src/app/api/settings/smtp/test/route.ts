import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api";
import { smtpSettingsSchema, sendTestEmailSchema } from "@/lib/validators";
import { sendTestEmail } from "@/lib/email";
import { getSmtpSettings } from "@/lib/settings";

export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await request.json();

    const configResult = smtpSettingsSchema.safeParse(body);
    const toResult = sendTestEmailSchema.safeParse(body);

    if (!configResult.success || !toResult.success) {
      return NextResponse.json(
        { error: configResult.success ? toResult.error?.flatten() : configResult.error.flatten() },
        { status: 400 }
      );
    }

    let password = configResult.data.password;
    if (!password) {
      const existing = await getSmtpSettings();
      password = existing?.password;
    }
    if (!password) {
      throw new ApiError(400, "Enter a password, or save your settings first.");
    }

    await sendTestEmail({ ...configResult.data, password }, toResult.data.to);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && !(error instanceof ApiError)) {
      return NextResponse.json({ error: `Failed to send test email: ${error.message}` }, { status: 502 });
    }
    return handleApiError(error);
  }
}
