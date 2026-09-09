import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";
import { SmtpSettingsForm } from "@/components/admin/SmtpSettingsForm";
import { getSmtpSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/format";

export default async function SmtpSettingsPage() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") redirect("/admin");

  const settings = await getSmtpSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Email settings</h1>
      <p className="mb-6 text-sm text-slate-600">
        Configure your SMTP credentials.
      </p>
      {settings && (
        <p className="mb-4 text-xs text-slate-500">
          Last updated {formatDateTime(settings.updatedAt)}
          {settings.updatedByEmail ? ` by ${settings.updatedByEmail}` : ""}
        </p>
      )}
      <Card className="p-6">
        <SmtpSettingsForm
          initial={
            settings
              ? {
                  host: settings.host,
                  port: settings.port,
                  secure: settings.secure,
                  rejectUnauthorized: settings.rejectUnauthorized,
                  username: settings.username,
                  fromName: settings.fromName,
                  fromEmail: settings.fromEmail,
                  hasPassword: Boolean(settings.password),
                  updatedAt: settings.updatedAt.toISOString(),
                  updatedByEmail: settings.updatedByEmail,
                }
              : null
          }
        />
      </Card>
    </div>
  );
}
