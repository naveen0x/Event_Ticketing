"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";

export function RegistrationForm({ slug }: { slug: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    const res = await fetch(`/api/public/events/${slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, organization, notes }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      if (data?.error?.fieldErrors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(data.error.fieldErrors)) {
          if (Array.isArray(msgs) && msgs.length) fieldErrors[key] = msgs[0] as string;
        }
        setErrors(fieldErrors);
      } else {
        setError(typeof data?.error === "string" ? data.error : "Something went wrong");
      }
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-md bg-emerald-50 p-4 text-emerald-800 ring-1 ring-inset ring-emerald-200">
        <p className="font-medium">Registration received!</p>
        <p className="mt-1 text-sm">
          Your registration is pending review. If approved, you&apos;ll receive an email with your
          ticket and QR code.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      )}
      <FormField label="Full name" htmlFor="fullName" error={errors.fullName}>
        <Input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </FormField>
      <FormField label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label="Phone" htmlFor="phone" error={errors.phone}>
        <Input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </FormField>
      <FormField label="Organization (optional)" htmlFor="organization" error={errors.organization}>
        <Input
          id="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
        />
      </FormField>
      <FormField label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <Button type="submit" className="w-full" loading={loading}>
        Submit registration
      </Button>
    </form>
  );
}
