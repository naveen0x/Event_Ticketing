"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Label } from "@/components/ui/Field";

export type PublicAdmin = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ORGANIZER";
  disabledAt: string | null;
  createdAt: string;
};

type Props = {
  initial?: PublicAdmin | null;
  onSaved: (admin: PublicAdmin) => void;
  onCancelEdit?: () => void;
};

export function AdminForm({ initial, onSaved, onCancelEdit }: Props) {
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ORGANIZER" | "SUPER_ADMIN">(initial?.role ?? "ORGANIZER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = isEdit ? `/api/admins/${initial!.id}` : "/api/admins";
    const method = isEdit ? "PATCH" : "POST";
    const payload = isEdit ? { name, email, password, role } : { name, email, password, role };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(
        typeof data?.error === "string" ? data.error : `Failed to ${isEdit ? "save" : "create"} admin`
      );
      return;
    }

    if (!isEdit) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("ORGANIZER");
    }
    onSaved(data.admin);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      )}
      <FormField label="Name" htmlFor="name">
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField label={isEdit ? "New password" : "Temporary password"} htmlFor="password">
        <Input
          id="password"
          type="password"
          minLength={8}
          required={!isEdit}
          placeholder={isEdit ? "Leave blank to keep the current password" : ""}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "ORGANIZER" | "SUPER_ADMIN")}
          className="block w-full rounded-md border-0 bg-white px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
        >
          <option value="ORGANIZER">Organizer</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Add admin"}
        </Button>
        {isEdit && (
          <Button type="button" variant="secondary" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
