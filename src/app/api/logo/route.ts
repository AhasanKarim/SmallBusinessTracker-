import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";

// Touches Prisma — must run at request time, not at build time (no DB at build).
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await prisma.businessSettings.findUnique({ where: { id: "singleton" } });
  if (!s?.logoStorageKey) return new NextResponse("No logo", { status: 404 });
  try {
    const file = await readUpload(s.logoStorageKey);
    return new NextResponse(file.buffer, {
      status: 200,
      headers: {
        "Content-Type": s.logoMimeType || "image/png",
        "Content-Length": String(file.size),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Logo file missing", { status: 404 });
  }
}
