import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_PUBLIC_SELECT } from "@/lib/admins";
import { AdminsPanel } from "@/components/admin/AdminsPanel";

export default async function AdminsPage() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") redirect("/admin");

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: ADMIN_PUBLIC_SELECT,
  });

  return (
    <AdminsPanel
      initialAdmins={admins.map((a) => ({
        ...a,
        disabledAt: a.disabledAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      }))}
      currentAdminId={session.user.id}
    />
  );
}
