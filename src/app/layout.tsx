import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Ticketing",
  description: "Event registration, approvals, QR tickets and on-site check-in.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        {children}
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          Powered by AES IT
        </footer>
        <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      </body>
    </html>
  );
}
