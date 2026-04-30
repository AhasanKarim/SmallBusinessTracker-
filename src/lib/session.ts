import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "sbt_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(): Promise<string> {
  return await new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
