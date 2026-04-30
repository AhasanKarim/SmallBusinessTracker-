import { prisma } from "@/lib/prisma";
import { Sidebar, MobileTopBar, MobileBottomNav } from "@/components/Nav";
import { Toaster } from "@/components/Toaster";

export const dynamic = "force-dynamic";

async function getBranding(): Promise<{ businessName: string; hasLogo: boolean }> {
  try {
    const s = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
    return {
      businessName: s?.businessName ?? "My Business",
      hasLogo: Boolean(s?.logoStorageKey),
    };
  } catch {
    return { businessName: "My Business", hasLogo: false };
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { businessName, hasLogo } = await getBranding();
  return (
    <div className="flex min-h-screen">
      <Sidebar businessName={businessName} hasLogo={hasLogo} />
      <div className="flex w-full min-w-0 flex-col">
        <MobileTopBar businessName={businessName} hasLogo={hasLogo} />
        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-6 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
      <Toaster />
    </div>
  );
}
