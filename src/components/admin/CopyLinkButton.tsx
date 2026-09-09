"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; nothing to fall back to.
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
