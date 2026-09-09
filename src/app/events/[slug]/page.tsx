import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { formatEventDateRange } from "@/lib/format";

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: { select: { registrations: { where: { status: "APPROVED" } } } },
    },
  });

  if (!event) notFound();

  const isFull = event.capacity != null && event._count.registrations >= event.capacity;
  const canRegister = event.registrationOpen && !isFull;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16">
      <Card className="p-8">
        <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
        <p className="mt-2 text-sm font-medium text-indigo-600">
          {formatEventDateRange(event.startAt, event.endAt)}
        </p>
        {event.location && <p className="mt-1 text-sm text-slate-600">{event.location}</p>}
        {event.description && (
          <p className="mt-6 whitespace-pre-line text-slate-700">{event.description}</p>
        )}

        <div className="mt-8">
          {canRegister ? (
            <Link
              href={`/events/${event.slug}/register`}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Register now
            </Link>
          ) : (
            <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
              {isFull ? "This event is full." : "Registration is currently closed for this event."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
