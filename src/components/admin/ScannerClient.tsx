"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/format";

type ScanResult = {
  ticket: { id: string; ticketCode: string };
  attendance: { id: string; status: "ATTENDED" | "NOT_ATTENDED"; checkedInAt: string | null };
  registration: { id: string; fullName: string; email: string; organization: string | null };
  event: { id: string; title: string };
};

export function ScannerClient({ eventId }: { eventId: string }) {
  const readerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [paused, setPaused] = useState(false);
  const processingRef = useRef(false);

  const handleDecoded = useCallback(
    async (token: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setPaused(true);
      scannerRef.current?.pause(true);

      setLookupError(null);
      setResult(null);

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, eventId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setLookupError(data?.error ?? "Ticket not found");
        } else {
          setResult(data);
        }
      } catch {
        setLookupError("Network error while looking up ticket");
      } finally {
        processingRef.current = false;
      }
    },
    [eventId]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!window.isSecureContext) {
        setCameraError(
          "Camera access requires HTTPS (or localhost). You're loading this page over plain HTTP from a non-localhost address — ask whoever deployed this to serve it over HTTPS, or run `npm run dev:https` for local testing from another device."
        );
        return;
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !readerRef.current) return;

      const scanner = new Html5Qrcode(readerRef.current.id);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // Keep the scan target a square that comfortably fits small phone
            // screens, rather than a fixed 250px box that can overflow them.
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
              return { width: size, height: size };
            },
          },
          (decodedText) => handleDecoded(decodedText),
          () => {
            // ignore per-frame decode failures
          }
        );
      } catch {
        if (!cancelled) {
          setCameraError(
            "Could not access the camera. Check browser permissions or use a device with a camera."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [handleDecoded]);

  function resumeScanning() {
    setResult(null);
    setLookupError(null);
    setPaused(false);
    scannerRef.current?.resume();
  }

  async function confirmCheckIn() {
    if (!result) return;
    setCheckingIn(true);
    const res = await fetch(`/api/attendance/${result.attendance.id}/check-in`, {
      method: "POST",
    });
    const data = await res.json();
    setCheckingIn(false);

    if (!res.ok) {
      toast.error(data?.error ?? "Failed to check in");
      return;
    }

    toast.success(`${result.registration.fullName} checked in`);
    setResult({ ...result, attendance: data.attendance });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <div
          id="qr-reader"
          ref={readerRef}
          className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-black"
        />
        {cameraError && (
          <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
            {cameraError}
          </p>
        )}
        {paused && !cameraError && (
          <p className="mt-3 text-center text-sm text-slate-500">Scanning paused</p>
        )}
      </div>

      <div>
        {!result && !lookupError && (
          <p className="text-sm text-slate-500">Point the camera at an attendee&apos;s ticket QR code.</p>
        )}

        {lookupError && (
          <div className="rounded-xl bg-rose-50 p-4 ring-1 ring-inset ring-rose-200">
            <p className="font-medium text-rose-800">{lookupError}</p>
            <Button className="mt-4" variant="secondary" onClick={resumeScanning}>
              Scan next
            </Button>
          </div>
        )}

        {result && (
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <StatusBadge status={result.attendance.status} />
              <span className="font-mono text-xs text-slate-500">{result.ticket.ticketCode}</span>
            </div>
            <p className="text-lg font-semibold text-slate-900">{result.registration.fullName}</p>
            <p className="text-sm text-slate-600">{result.registration.email}</p>
            {result.registration.organization && (
              <p className="text-sm text-slate-500">{result.registration.organization}</p>
            )}
            <p className="mt-1 text-sm text-slate-500">{result.event.title}</p>

            {result.attendance.status === "ATTENDED" ? (
              <p className="mt-4 text-sm text-indigo-700">
                Already checked in
                {result.attendance.checkedInAt
                  ? ` at ${formatDateTime(new Date(result.attendance.checkedInAt))}`
                  : ""}
                .
              </p>
            ) : (
              <Button className="mt-4 w-full" loading={checkingIn} onClick={confirmCheckIn}>
                Confirm check-in
              </Button>
            )}

            <Button className="mt-2 w-full" variant="secondary" onClick={resumeScanning}>
              Scan next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
