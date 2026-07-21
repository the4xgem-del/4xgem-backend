import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/utils/password";

describe("password utils", () => {
  it("hashes a password to a non-plaintext argon2 string", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toBe("Sup3rSecret!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword(hash, "Sup3rSecret!")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    await expect(verifyPassword(hash, "WrongPassword!")).resolves.toBe(false);
  });

  it("never throws on a malformed hash — returns false instead", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
