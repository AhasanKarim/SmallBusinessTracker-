import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * Verifies a plaintext password against the stored hash.
 *
 * On first run there is no hash in the DB. If APP_PASSWORD_HASH is set, that is
 * used directly. Otherwise APP_PASSWORD is hashed and persisted on first
 * successful match. After that, the env vars are no longer required.
 */
export async function verifyPassword(plain: string): Promise<boolean> {
  if (!plain) return false;

  const stored = await prisma.authCredential.findUnique({
    where: { id: "singleton" },
  });

  if (stored) {
    return bcrypt.compare(plain, stored.passwordHash);
  }

  const envHash = process.env.APP_PASSWORD_HASH?.trim();
  if (envHash) {
    const ok = await bcrypt.compare(plain, envHash);
    if (ok) {
      await prisma.authCredential.upsert({
        where: { id: "singleton" },
        update: { passwordHash: envHash },
        create: { id: "singleton", passwordHash: envHash },
      });
    }
    return ok;
  }

  const envPlain = process.env.APP_PASSWORD;
  if (envPlain && plain === envPlain) {
    const hash = await bcrypt.hash(envPlain, 12);
    await prisma.authCredential.upsert({
      where: { id: "singleton" },
      update: { passwordHash: hash },
      create: { id: "singleton", passwordHash: hash },
    });
    return true;
  }

  return false;
}

export async function hasAnyCredential(): Promise<boolean> {
  const c = await prisma.authCredential.findUnique({ where: { id: "singleton" } });
  if (c) return true;
  return Boolean(process.env.APP_PASSWORD || process.env.APP_PASSWORD_HASH);
}

export async function setPassword(plain: string): Promise<void> {
  const hash = await bcrypt.hash(plain, 12);
  await prisma.authCredential.upsert({
    where: { id: "singleton" },
    update: { passwordHash: hash },
    create: { id: "singleton", passwordHash: hash },
  });
}
