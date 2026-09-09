import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatEventDateRange } from "@/lib/format";
import { RegistrationsPanel } from "@/components/admin/RegistrationsPanel";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) notFound();

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { ticket: { include: { attendance: true } } },
  });

  const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;
  const registrationUrl = `${process.env.APP_URL ?? ""}/events/${event.slug}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatEventDateRange(event.startAt, event.endAt)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${event.id}/scan`}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Scan tickets
          </Link>
          <Link
            href={`/admin/events/${event.id}/attendance`}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            Attendance
          </Link>
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            Edit
          </Link>
        </div>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Registration link
          </p>
          <p className="truncate text-sm text-slate-800">{registrationUrl}</p>
        </div>
        <div className="flex items-center gap-3">
          {event.capacity != null && (
            <span className="text-sm text-slate-600">
              {approvedCount}/{event.capacity} approved
            </span>
          )}
          <CopyLinkButton url={registrationUrl} />
        </div>
      </Card>

      <RegistrationsPanel initialRegistrations={registrations} />
    </div>
  );
}
