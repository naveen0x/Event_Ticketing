import { Card } from "@/components/ui/Card";
import { EventForm } from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Create event</h1>
      <Card className="p-6">
        <EventForm />
      </Card>
    </div>
  );
}
