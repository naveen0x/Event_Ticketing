import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatEventDateRange } from "@/lib/format";

export default async function AdminDashboardPage() {
  const [events, statusCounts] = await Promise.all([
    prisma.event.findMany({ orderBy: { startAt: "desc" } }),
    prisma.registration.groupBy({ by: ["eventId", "status"], _count: true }),
  ]);

  const countsByEvent = new Map<string, Record<string, number>>();
  for (const row of statusCounts) {
    const current = countsByEvent.get(row.eventId) ?? {};
    current[row.status] = row._count;
    countsByEvent.set(row.eventId, current);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-600">Create events and manage registrations.</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Create event
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="p-8 text-center text-slate-600">
          No events yet. Create your first event to get a shareable registration link.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const counts = countsByEvent.get(event.id) ?? {};
            return (
              <Link key={event.id} href={`/admin/events/${event.id}`}>
                <Card className="h-full p-5 hover:ring-indigo-300 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{event.title}</h2>
                    {!event.registrationOpen && (
                      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Closed
                      </span>
                    )}
                  </div>
                  <p className="mb-4 text-sm text-slate-600">
                    {formatEventDateRange(event.startAt, event.endAt)}
                  </p>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-amber-50 py-2">
                      <dt className="text-amber-700">Pending</dt>
                      <dd className="font-semibold text-amber-900">{counts.PENDING ?? 0}</dd>
                    </div>
                    <div className="rounded-md bg-emerald-50 py-2">
                      <dt className="text-emerald-700">Approved</dt>
                      <dd className="font-semibold text-emerald-900">{counts.APPROVED ?? 0}</dd>
                    </div>
                    <div className="rounded-md bg-rose-50 py-2">
                      <dt className="text-rose-700">Rejected</dt>
                      <dd className="font-semibold text-rose-900">{counts.REJECTED ?? 0}</dd>
                    </div>
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
