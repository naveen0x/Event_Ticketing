"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Label } from "@/components/ui/Field";

type EventFormValues = {
  id?: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  capacity: string;
  registrationOpen: boolean;
};

function toDatetimeLocal(value?: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function EventForm({
  initial,
  registrationCount = 0,
}: {
  initial?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startAt: Date | string;
    endAt: Date | string | null;
    capacity: number | null;
    registrationOpen: boolean;
  };
  registrationCount?: number;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);

  const [values, setValues] = useState<EventFormValues>({
    id: initial?.id,
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    startAt: toDatetimeLocal(initial?.startAt),
    endAt: toDatetimeLocal(initial?.endAt),
    capacity: initial?.capacity != null ? String(initial.capacity) : "",
    registrationOpen: initial?.registrationOpen ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const warning =
      registrationCount > 0
        ? `Delete "${values.title}"? This permanently deletes the event along with all ${registrationCount} registration(s), tickets, and attendance records. This cannot be undone.`
        : `Delete "${values.title}"? This cannot be undone.`;

    if (!window.confirm(warning)) return;

    setDeleting(true);
    const res = await fetch(`/api/events/${values.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    router.push("/admin");
    router.refresh();
  }

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setLoading(true);

    const payload = {
      title: values.title,
      description: values.description,
      location: values.location,
      startAt: values.startAt ? new Date(values.startAt).toISOString() : undefined,
      endAt: values.endAt ? new Date(values.endAt).toISOString() : null,
      capacity: values.capacity ? Number(values.capacity) : null,
      registrationOpen: values.registrationOpen,
    };

    const url = isEdit ? `/api/events/${values.id}` : "/api/events";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.error?.fieldErrors) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(data.error.fieldErrors)) {
          if (Array.isArray(msgs) && msgs.length) fieldErrors[key] = msgs[0] as string;
        }
        setErrors(fieldErrors);
      } else {
        toast.error(data?.error ?? "Something went wrong");
      }
      return;
    }

    const data = await res.json();
    toast.success(isEdit ? "Event updated" : "Event created");
    router.push(`/admin/events/${data.event.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Title" htmlFor="title" error={errors.title}>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => update("title", e.target.value)}
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={errors.description}>
        <Textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </FormField>

      <FormField label="Location" htmlFor="location" error={errors.location}>
        <Input
          id="location"
          value={values.location}
          onChange={(e) => update("location", e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Start" htmlFor="startAt" error={errors.startAt}>
          <Input
            id="startAt"
            type="datetime-local"
            required
            value={values.startAt}
            onChange={(e) => update("startAt", e.target.value)}
          />
        </FormField>
        <FormField label="End (optional)" htmlFor="endAt" error={errors.endAt}>
          <Input
            id="endAt"
            type="datetime-local"
            value={values.endAt}
            onChange={(e) => update("endAt", e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Capacity (optional)" htmlFor="capacity" error={errors.capacity}>
        <Input
          id="capacity"
          type="number"
          min={1}
          value={values.capacity}
          onChange={(e) => update("capacity", e.target.value)}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <input
          id="registrationOpen"
          type="checkbox"
          checked={values.registrationOpen}
          onChange={(e) => update("registrationOpen", e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        />
        <Label htmlFor="registrationOpen">Registration is open</Label>
      </div>

      <Button type="submit" loading={loading}>
        {isEdit ? "Save changes" : "Create event"}
      </Button>

      {isEdit && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-rose-700">Danger zone</h3>
          <p className="mt-1 text-sm text-slate-600">
            Permanently delete this event and all of its registrations, tickets, and attendance
            records.
          </p>
          <Button type="button" variant="danger" className="mt-3" loading={deleting} onClick={handleDelete}>
            Delete event
          </Button>
        </div>
      )}
    </form>
  );
}
