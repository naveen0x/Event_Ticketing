import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatEventDateRange } from "@/lib/format";
import { qrCodeDataUrl } from "@/lib/qr";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketCode: string }>;
}) {
  const { ticketCode } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { ticketCode },
    include: {
      attendance: true,
      registration: { include: { event: true } },
    },
  });

  if (!ticket) notFound();

  const qrImage = await qrCodeDataUrl(ticket.qrToken);
  const { registration } = ticket;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <Card className="overflow-hidden">
        <div className="bg-indigo-600 px-6 py-5 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">
            Digital ticket
          </p>
          <h1 className="mt-1 text-xl font-bold">{registration.event.title}</h1>
          <p className="mt-1 text-sm text-indigo-100">
            {formatEventDateRange(registration.event.startAt, registration.event.endAt)}
          </p>
          {registration.event.location && (
            <p className="text-sm text-indigo-100">{registration.event.location}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-8">
          <Image
            src={qrImage}
            alt="Ticket QR code"
            width={220}
            height={220}
            unoptimized
            className="rounded-lg"
          />
          <p className="font-mono text-sm tracking-wide text-slate-700">{ticket.ticketCode}</p>
          <StatusBadge status={ticket.attendance?.status ?? "NOT_ATTENDED"} />
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attendee</p>
          <p className="text-slate-900">{registration.fullName}</p>
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-slate-500">
        Present this QR code at the entrance for check-in.
      </p>
    </div>
  );
}
