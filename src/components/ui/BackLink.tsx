import Link from "next/link";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
