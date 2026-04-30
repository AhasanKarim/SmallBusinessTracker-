"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Mode = "system" | "light" | "dark";

function applyTheme(mode: Mode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

function getSavedMode(): Mode {
  try {
    const v = localStorage.getItem("sbt-theme");
    if (v === "dark" || v === "light") return v;
  } catch {}
  return "system";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getSavedMode());
    setMounted(true);

    // Re-apply when the OS preference changes — only matters in "system" mode.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getSavedMode() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function pick(next: Mode) {
    setMode(next);
    try {
      if (next === "system") localStorage.removeItem("sbt-theme");
      else localStorage.setItem("sbt-theme", next);
    } catch {}
    applyTheme(next);
  }

  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <SunIcon /> },
    { value: "system", label: "System", icon: <MonitorIcon /> },
    { value: "dark", label: "Dark", icon: <MoonIcon /> },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
    >
      {options.map((opt) => {
        const active = mounted && opt.value === mode;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-sm text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-700",
            )}
          >
            <span className="h-4 w-4">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}
