import { cookies } from "next/headers";

export type FlashKind = "success" | "error" | "info";

const COOKIE = "sbt-flash";

/**
 * Push a transient toast that the next page render will surface.
 * Cookie is short-lived and readable from the client (the Toaster polls).
 */
export function setFlash(message: string, kind: FlashKind = "success"): void {
  cookies().set(COOKIE, JSON.stringify({ m: message, k: kind, t: Date.now() }), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 15,
  });
}
