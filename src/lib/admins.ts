import { prisma } from "@/lib/prisma";

export function countActiveSuperAdmins(excludingId?: string) {
  return prisma.admin.count({
    where: {
      role: "SUPER_ADMIN",
      disabledAt: null,
      ...(excludingId ? { id: { not: excludingId } } : {}),
    },
  });
}

export const ADMIN_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  disabledAt: true,
  createdAt: true,
} as const;
