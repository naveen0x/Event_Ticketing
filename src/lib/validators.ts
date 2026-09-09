import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    location: z.string().trim().max(300).optional().or(z.literal("")),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional().nullable(),
    capacity: z.coerce.number().int().positive().optional().nullable(),
    registrationOpen: z.boolean().default(true),
  })
  .refine((data) => !data.endAt || data.endAt >= data.startAt, {
    message: "End date must be after the start date",
    path: ["endAt"],
  });

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(40),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const rejectSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["SUPER_ADMIN", "ORGANIZER"]).default("ORGANIZER"),
});

export const updateAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email(),
  // Optional on update: an empty value means "keep the existing password".
  password: z.union([z.literal(""), z.string().min(8).max(200)]).optional(),
  role: z.enum(["SUPER_ADMIN", "ORGANIZER"]),
});

export const smtpSettingsSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  rejectUnauthorized: z.boolean().default(true),
  username: z.string().trim().min(1).max(255),
  // Optional on update: an empty value means "keep the existing password".
  password: z.string().max(500).optional().or(z.literal("")),
  fromName: z.string().trim().min(1).max(160),
  fromEmail: z.string().trim().email(),
});

export const sendTestEmailSchema = z.object({
  to: z.string().trim().email(),
});

export type EventInput = z.infer<typeof eventSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
