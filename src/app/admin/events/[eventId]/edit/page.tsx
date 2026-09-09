import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EventForm } from "@/components/admin/EventForm";
import { BackLink } from "@/components/ui/BackLink";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/admin/events/${eventId}`} label="Back to event" />
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Edit event</h1>
      <Card className="p-6">
        <EventForm initial={event} registrationCount={event._count.registrations} />
      </Card>
    </div>
  );
}
