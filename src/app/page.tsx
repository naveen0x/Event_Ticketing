import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-600">
        Event Ticketing
      </p>
      <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Registrations, approvals, QR tickets and check-in — all in one place.
      </h1>
      <p className="mt-4 max-w-xl text-slate-600">
        Attendees register through the link an organiser shares with them. Organisers manage
        everything from the admin dashboard.
      </p>
      <div className="mt-8">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Organiser sign in
        </Link>
      </div>
    </div>
  );
}
