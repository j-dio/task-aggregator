import { assertSafePublicUrl, UnsafeUrlError } from "../url-guard";
import { describe, it, expect } from "vitest";

describe("assertSafePublicUrl", () => {
  it("passes a real public URL", async () => {
    await expect(
      assertSafePublicUrl("https://example.com/cal"),
    ).resolves.toBeUndefined();
  });

  it("rejects http", async () => {
    await expect(
      assertSafePublicUrl("http://example.com"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects localhost", async () => {
    await expect(
      assertSafePublicUrl("https://localhost/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects loopback IP", async () => {
    await expect(
      assertSafePublicUrl("https://127.0.0.1/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects private 192.168.x.x", async () => {
    await expect(
      assertSafePublicUrl("https://192.168.1.1/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects 10.x.x.x", async () => {
    await expect(
      assertSafePublicUrl("https://10.0.0.1/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects link-local 169.254.x.x", async () => {
    await expect(
      assertSafePublicUrl("https://169.254.169.254/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects .internal suffix", async () => {
    await expect(
      assertSafePublicUrl("https://db.internal/cal"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects credentials in URL", async () => {
    await expect(
      assertSafePublicUrl("https://user:pass@example.com"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
