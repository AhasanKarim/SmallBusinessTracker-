"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: IconHome },
  { href: "/events", label: "Events", icon: IconCalendar },
  { href: "/income", label: "Income", icon: IconArrowDown },
  { href: "/expenses", label: "Expenses", icon: IconArrowUp },
  { href: "/cards", label: "Credit Cards", icon: IconCard },
  { href: "/documents", label: "Documents", icon: IconDoc },
  { href: "/reports", label: "Reports", icon: IconChart },
  { href: "/settings", label: "Settings", icon: IconCog },
];

function BrandMark({ hasLogo }: { hasLogo: boolean }) {
  if (hasLogo) {
    // Bust cache when settings update (the layout re-renders so this re-mounts).
    return (
      <img
        src={`/api/logo?ts=${Date.now()}`}
        alt="Logo"
        className="h-8 w-8 rounded-md object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-7 9 7M5 10v10h14V10" />
      </svg>
    </div>
  );
}

export function Sidebar({ businessName, hasLogo = false }: { businessName: string; hasLogo?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-slate-200 md:bg-white md:dark:border-slate-800 md:dark:bg-slate-900">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
        <BrandMark hasLogo={hasLogo} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{businessName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Business Tracker</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400 dark:text-slate-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2 dark:border-slate-800">
        <LogoutButton />
      </div>
    </aside>
  );
}

export function MobileTopBar({ businessName, hasLogo = false }: { businessName: string; hasLogo?: boolean }) {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-2">
        <BrandMark hasLogo={hasLogo} />
        <p className="truncate text-sm font-semibold">{businessName}</p>
      </div>
      <LogoutButton compact />
    </div>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: IconHome },
    { href: "/events", label: "Events", icon: IconCalendar },
    { href: "/income", label: "Income", icon: IconArrowDown },
    { href: "/expenses", label: "Expenses", icon: IconArrowUp },
    { href: "/reports", label: "Reports", icon: IconChart },
    { href: "/settings", label: "More", icon: IconCog },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-brand-700 dark:text-brand-300" : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon className={cn("h-5 w-5", active ? "text-brand-600 dark:text-brand-300" : "text-slate-400 dark:text-slate-500")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      className={cn(
        "btn-ghost w-full",
        compact && "w-auto px-2 text-xs",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4m6-12h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
      </svg>
      {compact ? "Log out" : "Sign out"}
    </button>
  );
}

// --- Inline icons (avoid extra dependency) ---
function IconHome(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
    </svg>
  );
}
function IconCalendar(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  );
}
function IconArrowDown(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
    </svg>
  );
}
function IconArrowUp(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V4m0 0l-6 6m6-6l6 6" />
    </svg>
  );
}
function IconCard(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M3 10h18M7 15h4" />
    </svg>
  );
}
function IconDoc(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}
function IconChart(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-2" />
    </svg>
  );
}
function IconCog(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  );
}
