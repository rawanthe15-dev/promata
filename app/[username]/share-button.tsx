"use client";

import { useEffect, useRef, useState } from "react";

export function ShareButton({
  url,
  qrSvg,
}: {
  url: string;
  qrSvg: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!popRef.current) return;
      if (popRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Share this page"
        title="Share"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition hover:scale-105 active:scale-95"
        style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--fg)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </button>

      {open ? (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Share"
          className="absolute right-0 z-30 mt-2 w-72 rounded-3xl border p-4 shadow-lg"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
            color: "var(--fg)",
          }}
        >
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Share
          </p>

          <div
            className="mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="min-w-0 flex-1 truncate text-xs" title={url}>
              {url.replace(/^https?:\/\//, "")}
            </span>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition active:scale-95"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {copied ? "copied!" : "copy"}
            </button>
          </div>

          <div className="mt-3 flex justify-center rounded-2xl border p-3" style={{ borderColor: "var(--border)" }}>
            <div
              className="h-[200px] w-[200px]"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
          <p className="mt-2 text-center text-[10px]" style={{ color: "var(--muted)" }}>
            scan to open
          </p>
        </div>
      ) : null}
    </div>
  );
}
