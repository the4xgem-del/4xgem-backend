import argon2 from "argon2";

/** argon2id is the OWASP-recommended variant for password hashing. */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB, OWASP 2023 minimum
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string | null | undefined, plain: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
