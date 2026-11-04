import argon2 from "argon2";

export const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19456 KiB (OWASP minimum profile)
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

/**
 * Hash password using Argon2id per OWASP minimum profile (NFR-03).
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
}

/**
 * Verify password against stored Argon2id hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith("$argon2")) {
    return false;
  }
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

