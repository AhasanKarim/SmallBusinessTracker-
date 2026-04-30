"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };

const COOKIE = "sbt-flash";

function readFlash(): { m: string; k: Toast["kind"]; t: number } | null {
  if (typeof document === "undefined") return null;
  const all = document.cookie ? document.cookie.split(";") : [];
  for (const raw of all) {
    const [name, ...rest] = raw.trim().split("=");
    if (name === COOKIE) {
      try {
        return JSON.parse(decodeURIComponent(rest.join("=")));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function clearFlash() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastTs = useRef<number>(0);

  useEffect(() => {
    function check() {
      const f = readFlash();
      if (f && f.t !== lastTs.current) {
        lastTs.current = f.t;
        const id = Date.now() + Math.random();
        setToasts((cur) => [...cur, { id, message: f.m, kind: f.k }]);
        clearFlash();
        // auto-dismiss after 3.5s
        setTimeout(() => {
          setToasts((cur) => cur.filter((t) => t.id !== id));
        }, 3500);
      }
    }
    check();
    const handle = setInterval(check, 400);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(handle);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-3 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg ring-1 backdrop-blur",
            t.kind === "success" && "bg-green-50/95 text-green-800 ring-green-200 dark:bg-green-900/80 dark:text-green-100 dark:ring-green-800",
            t.kind === "error" && "bg-red-50/95 text-red-800 ring-red-200 dark:bg-red-900/80 dark:text-red-100 dark:ring-red-800",
            t.kind === "info" && "bg-slate-900/95 text-white ring-slate-700 dark:bg-slate-100/90 dark:text-slate-900 dark:ring-slate-300",
          )}
        >
          <span aria-hidden>
            {t.kind === "success" ? "✓" : t.kind === "error" ? "⚠" : "ℹ"}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
            className="opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
