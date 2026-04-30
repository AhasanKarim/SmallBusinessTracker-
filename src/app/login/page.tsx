"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <Suspense fallback={<LoginShell />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="card w-full max-w-sm p-6">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-7 9 7M5 10v10h14V10" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold">Small Business Tracker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter your password to continue</p>
      </div>
      {children}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            autoFocus
            autoComplete="current-password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </LoginShell>
  );
}
