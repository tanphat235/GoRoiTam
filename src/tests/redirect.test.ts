import { describe, expect, it } from "vitest";
import { safeNext, siteUrl } from "@/modules/auth/redirect";

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/community?tab=anonymous")).toBe("/community?tab=anonymous");
  });
  it("blocks open redirects", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext(String.raw`/\evil.com`)).toBe("/");
    expect(safeNext(null, "/x")).toBe("/x");
  });
});

describe("siteUrl", () => {
  it("builds the origin from forwarded headers", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const h = { get: (n: string) => ({ "x-forwarded-proto": "https", host: "app.example.com" })[n] ?? null };
    expect(siteUrl(h)).toBe("https://app.example.com");
  });
});
