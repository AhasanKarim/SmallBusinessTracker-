import { buildExportArchive } from "@/lib/data-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = await buildExportArchive();
  const ts = new Date().toISOString().slice(0, 10);
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="sbt-backup-${ts}.zip"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}
