import { describe, it, expect } from "vitest";
import { updateProfileSchema, updatePreferencesSchema } from "@/modules/me/me.schema";

describe("updateProfileSchema", () => {
  it("allows updating just one field", () => {
    expect(updateProfileSchema.safeParse({ firstName: "Ada" }).success).toBe(true);
  });

  it("rejects an empty string name", () => {
    expect(updateProfileSchema.safeParse({ firstName: "" }).success).toBe(false);
  });
});

describe("updatePreferencesSchema", () => {
  it("accepts a partial preferences update", () => {
    expect(updatePreferencesSchema.safeParse({ emailAlerts: false }).success).toBe(true);
  });

  it("caps favoriteInstruments at 50 entries", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `PAIR${i}`);
    expect(updatePreferencesSchema.safeParse({ favoriteInstruments: tooMany }).success).toBe(false);
  });

  it("rejects an invalid theme value", () => {
    expect(updatePreferencesSchema.safeParse({ theme: "solarized" }).success).toBe(false);
  });
});
