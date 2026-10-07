"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Attendance, Registration, Ticket } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";

type RegistrationWithTicket = Registration & {
  ticket: (Ticket & { attendance: Attendance | null }) | null;
};

const EMPTY = { fullName: "", email: "", phone: "", notes: "" };

export function AddGuestDialog({
  eventId,
  open,
  onClose,
  onAdded,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (registration: RegistrationWithTicket) => void;
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  function update(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await fetch(`/api/events/${eventId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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
        toast.error(data?.error ?? "Failed to add guest");
      }
      return;
    }

    if (data.emailSent) {
      toast.success(`Invitation sent to ${data.registration.email}`);
    } else {
      toast.error("Guest added, but the invitation email failed. Use Resend to try again.");
    }
    onAdded(data.registration);
    setValues(EMPTY);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-guest-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="add-guest-title" className="text-lg font-semibold text-slate-900">
          Add guest
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Guests are approved immediately and emailed an invitation with their QR pass.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormField label="Name" htmlFor="guest-fullName" error={errors.fullName}>
            <Input
              id="guest-fullName"
              required
              autoFocus
              value={values.fullName}
              onChange={(e) => update("fullName", e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor="guest-email" error={errors.email}>
            <Input
              id="guest-email"
              type="email"
              required
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </FormField>
          <FormField label="Contact number" htmlFor="guest-phone" error={errors.phone}>
            <Input
              id="guest-phone"
              type="tel"
              required
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </FormField>
          <FormField label="Notes (optional)" htmlFor="guest-notes" error={errors.notes}>
            <Textarea
              id="guest-notes"
              rows={3}
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add &amp; send invitation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
