"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Label } from "@/components/ui/Field";

type InitialSettings = {
  host: string;
  port: number;
  secure: boolean;
  rejectUnauthorized: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
  updatedAt: string;
  updatedByEmail: string | null;
} | null;

export function SmtpSettingsForm({ initial }: { initial: InitialSettings }) {
  const [host, setHost] = useState(initial?.host ?? "");
  const [port, setPort] = useState(initial ? String(initial.port) : "587");
  const [secure, setSecure] = useState(initial?.secure ?? false);
  const [rejectUnauthorized, setRejectUnauthorized] = useState(
    initial?.rejectUnauthorized ?? true
  );
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState("");
  const [fromName, setFromName] = useState(initial?.fromName ?? "Event Ticketing");
  const [fromEmail, setFromEmail] = useState(initial?.fromEmail ?? "");
  const [hasPassword, setHasPassword] = useState(initial?.hasPassword ?? false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  function currentConfig() {
    return {
      host,
      port: Number(port),
      secure,
      rejectUnauthorized,
      username,
      password,
      fromName,
      fromEmail,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const res = await fetch("/api/settings/smtp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentConfig()),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      if (data?.error?.fieldErrors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(data.error.fieldErrors)) {
          if (Array.isArray(msgs) && msgs.length) fieldErrors[key] = msgs[0] as string;
        }
        setErrors(fieldErrors);
      } else {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to save settings");
      }
      return;
    }

    setPassword("");
    setHasPassword(true);
    toast.success("Email settings saved");
  }

  async function handleTest() {
    if (!testTo) {
      toast.error("Enter an email address to send the test to");
      return;
    }
    setTesting(true);
    const res = await fetch("/api/settings/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...currentConfig(), to: testTo }),
    });
    const data = await res.json().catch(() => ({}));
    setTesting(false);

    if (!res.ok) {
      toast.error(typeof data?.error === "string" ? data.error : "Test email failed");
      return;
    }

    toast.success(`Test email sent to ${testTo}`);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormField label="SMTP host" htmlFor="host" error={errors.host}>
              <Input
                id="host"
                required
                placeholder="smtp.example.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Port" htmlFor="port" error={errors.port}>
            <Input
              id="port"
              type="number"
              required
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="secure"
            type="checkbox"
            checked={secure}
            onChange={(e) => setSecure(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
          />
          <Label htmlFor="secure">Use TLS/SSL (usually port 465)</Label>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <input
              id="rejectUnauthorized"
              type="checkbox"
              checked={!rejectUnauthorized}
              onChange={(e) => setRejectUnauthorized(!e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <Label htmlFor="rejectUnauthorized">Allow self-signed certificate</Label>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Only enable this for a trusted internal or self-hosted mail server — it skips
            certificate verification, so the connection could be intercepted on an untrusted
            network. If you saw a &quot;self-signed certificate&quot; error while testing, this is
            what fixes it.
          </p>
        </div>

        <FormField label="Username" htmlFor="username" error={errors.username}>
          <Input
            id="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </FormField>

        <FormField
          label={hasPassword ? "Password" : "Password (required)"}
          htmlFor="password"
          error={errors.password}
        >
          <Input
            id="password"
            type="password"
            placeholder={hasPassword ? "Leave blank to keep the current password" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="From name" htmlFor="fromName" error={errors.fromName}>
            <Input
              id="fromName"
              required
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </FormField>
          <FormField label="From email" htmlFor="fromEmail" error={errors.fromEmail}>
            <Input
              id="fromEmail"
              type="email"
              required
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </FormField>
        </div>

        <Button type="submit" loading={saving}>
          Save settings
        </Button>
      </form>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Send a test email</h3>
        <p className="mt-1 text-sm text-slate-600">
          Uses the values above (unsaved changes included) so you can verify before saving.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Label htmlFor="testTo">Send to</Label>
            <Input
              id="testTo"
              type="email"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" loading={testing} onClick={handleTest}>
            Send test email
          </Button>
        </div>
      </div>
    </div>
  );
}
