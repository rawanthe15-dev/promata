"use client";

import { useTransition } from "react";
import { setThemeAction } from "./actions";
import { THEME_LIST, type Theme } from "@/lib/themes";

export function ThemeSwitcher({
  username,
  current,
}: {
  username: string;
  current: string;
}) {
  const [pending, start] = useTransition();

  function pick(theme: Theme) {
    if (pending || theme.name === current) return;
    const fd = new FormData();
    fd.set("username", username);
    fd.set("theme", theme.name);
    start(async () => {
      await setThemeAction(fd);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1.5"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
      role="radiogroup"
      aria-label="Theme"
    >
      <span className="px-1 text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
        theme
      </span>
      {THEME_LIST.map((t) => {
        const active = t.name === current;
        return (
          <button
            key={t.name}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.label}
            title={t.label}
            disabled={pending}
            onClick={() => pick(t)}
            className="relative h-5 w-5 rounded-full border transition hover:scale-110 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientVia}, ${t.gradientTo})`,
              borderColor: active ? t.accent : "var(--border)",
              boxShadow: active ? `0 0 0 2px var(--card), 0 0 0 3.5px ${t.accent}` : undefined,
              opacity: pending && !active ? 0.5 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
