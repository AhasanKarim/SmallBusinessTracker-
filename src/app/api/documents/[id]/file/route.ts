import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  let file;
  try {
    file = await readUpload(doc.storageKey);
  } catch {
    return new NextResponse("File missing on disk", { status: 404 });
  }

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";

  return new NextResponse(file.buffer, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(file.size),
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(doc.filename)}"`,
    },
  });
}
