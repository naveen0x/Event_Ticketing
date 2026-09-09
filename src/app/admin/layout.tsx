import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const navItems = [
    { href: "/admin", label: "Events" },
    ...(session.user.role === "SUPER_ADMIN"
      ? [
          { href: "/admin/settings/admins", label: "Admins" },
          { href: "/admin/settings/smtp", label: "Email" },
        ]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="text-lg font-bold text-slate-900">
            Event Ticketing
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-600 sm:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
