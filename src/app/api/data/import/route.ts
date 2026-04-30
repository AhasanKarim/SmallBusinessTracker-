import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { importArchive, type ImportMode } from "@/lib/data-import";
import { setFlash } from "@/lib/flash";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const settingsUrl = new URL("/settings", req.url);
  try {
    const formData = await req.formData();
    const file = formData.get("backup");
    const modeRaw = String(formData.get("mode") ?? "merge");
    const mode: ImportMode = modeRaw === "replace" ? "replace" : "merge";

    if (!(file instanceof File) || file.size === 0) {
      setFlash("No backup file selected", "error");
      return NextResponse.redirect(settingsUrl, { status: 303 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importArchive(buf, mode);

    const c = result.counts;
    const summary =
      `Imported ${c.creditCards} card${plural(c.creditCards)}, ` +
      `${c.events} event${plural(c.events)}, ` +
      `${c.incomes} income, ` +
      `${c.expenses} expense${plural(c.expenses)}, ` +
      `${c.documents} document${plural(c.documents)}` +
      (result.warnings.length ? ` (${result.warnings.length} warning${plural(result.warnings.length)})` : "");

    setFlash(summary, "success");
    revalidatePath("/", "layout");
    return NextResponse.redirect(settingsUrl, { status: 303 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown import error";
    setFlash(`Import failed: ${msg}`, "error");
    return NextResponse.redirect(settingsUrl, { status: 303 });
  }
}

function plural(n: number): string {
  return n === 1 ? "" : "s";
}
