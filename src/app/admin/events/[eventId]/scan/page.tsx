import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ScannerClient } from "@/components/admin/ScannerClient";
import { BackLink } from "@/components/ui/BackLink";

export default async function ScanPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
  if (!event) notFound();

  return (
    <div>
      <BackLink href={`/admin/events/${eventId}`} label="Back to event" />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Scan tickets</h1>
      <p className="mb-6 text-sm text-slate-600">{event.title}</p>
      <ScannerClient eventId={eventId} />
    </div>
  );
}
