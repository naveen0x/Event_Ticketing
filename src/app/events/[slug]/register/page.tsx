import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { RegistrationForm } from "@/components/public/RegistrationForm";
import { formatEventDateRange } from "@/lib/format";

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
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
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatEventDateRange(event.startAt, event.endAt)}
        </p>
      </div>
      <Card className="p-6">
        {canRegister ? (
          <RegistrationForm slug={event.slug} />
        ) : (
          <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
            {isFull ? "This event is full." : "Registration is currently closed for this event."}
          </p>
        )}
      </Card>
    </div>
  );
}
