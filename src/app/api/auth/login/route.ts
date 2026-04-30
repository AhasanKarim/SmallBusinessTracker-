import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(req: Request) {
  let password = "";
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      password = String(body?.password ?? "");
    } else {
      const fd = await req.formData();
      password = String(fd.get("password") ?? "");
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    // Only mark Secure when explicitly told to. Browsers reject Secure cookies
    // over plain HTTP (LAN access), which would prevent the session from
    // sticking. Set COOKIE_SECURE=true once you've put the app behind HTTPS.
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
