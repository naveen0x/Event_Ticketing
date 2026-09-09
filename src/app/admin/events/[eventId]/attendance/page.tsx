import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AttendanceTable } from "@/components/admin/AttendanceTable";
import { BackLink } from "@/components/ui/BackLink";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
  if (!event) notFound();

  const rows = await prisma.registration.findMany({
    where: { eventId, status: "APPROVED" },
    orderBy: { fullName: "asc" },
    include: { ticket: { include: { attendance: true } } },
  });

  return (
    <div>
      <BackLink href={`/admin/events/${eventId}`} label="Back to event" />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Attendance</h1>
      <p className="mb-6 text-sm text-slate-600">{event.title}</p>
      <AttendanceTable initialRows={rows} eventTitle={event.title} />
    </div>
  );
}
