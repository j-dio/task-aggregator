import { describe, expect, it } from "vitest";
import {
  isRedirectStatus,
  parseAllowedOrigins,
  resolveCorsHeaders,
  validateUvecUrl,
} from "./security";

describe("validateUvecUrl", () => {
  it("allows HTTPS Moodle calendar export URLs", () => {
    expect(
      validateUvecUrl(
        "https://uvec.edu.example/calendar/export_execute.php?token=abc",
      ).allowed,
    ).toBe(true);
  });

  it("rejects non-HTTPS schemes", () => {
    expect(
      validateUvecUrl("http://uvec.edu.example/calendar/export.php").reason,
    ).toBe("invalid-scheme");
    expect(
      validateUvecUrl("file:///etc/passwd/calendar/export.php").reason,
    ).toBe("invalid-scheme");
  });

  it("rejects loopback, private, and link-local IPv4 targets", () => {
    const blockedUrls = [
      "https://localhost/calendar/export.php",
      "https://127.0.0.1/calendar/export.php",
      "https://0.0.0.0/calendar/export.php",
      "https://10.1.2.3/calendar/export.php",
      "https://172.16.0.1/calendar/export.php",
      "https://172.31.255.255/calendar/export.php",
      "https://192.168.1.1/calendar/export.php",
      "https://169.254.1.1/calendar/export.php",
    ];

    for (const url of blockedUrls) {
      expect(validateUvecUrl(url).allowed, url).toBe(false);
    }
  });

  it("does not over-block public 172 IPv4 addresses", () => {
    expect(
      validateUvecUrl("https://172.15.0.1/calendar/export.php").allowed,
    ).toBe(true);
    expect(
      validateUvecUrl("https://172.32.0.1/calendar/export.php").allowed,
    ).toBe(true);
  });

  it("rejects loopback, private, link-local, and mapped IPv6 targets", () => {
    const blockedUrls = [
      "https://[::]/calendar/export.php",
      "https://[::1]/calendar/export.php",
      "https://[fc00::1]/calendar/export.php",
      "https://[fd12::1]/calendar/export.php",
      "https://[fe80::1]/calendar/export.php",
      "https://[::ffff:127.0.0.1]/calendar/export.php",
      "https://[::ffff:192.168.1.1]/calendar/export.php",
    ];

    for (const url of blockedUrls) {
      expect(validateUvecUrl(url).allowed, url).toBe(false);
    }
  });

  it("rejects public hostnames that resolve to blocked addresses", () => {
    const result = validateUvecUrl(
      "https://calendar.example.com/calendar/export.php",
      { resolvedAddresses: ["169.254.169.254"] },
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("blocked-resolved-ip");
  });

  it("requires a Moodle calendar export path", () => {
    expect(validateUvecUrl("https://uvec.edu.example/grades").reason).toBe(
      "invalid-path",
    );
  });
});

describe("CORS helpers", () => {
  it("builds an explicit origin allowlist from environment values", () => {
    expect(
      parseAllowedOrigins({
        SITE_URL: "https://app.example.com/dashboard",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        UVEC_PROXY_ALLOWED_ORIGINS:
          "https://preview.example.com,not-a-url, https://staging.example.com/path",
      }),
    ).toEqual([
      "https://preview.example.com",
      "https://staging.example.com",
      "https://app.example.com",
    ]);
  });

  it("returns CORS headers only for allowed browser origins", () => {
    const config = {
      allowedOrigins: ["https://app.example.com"],
      allowMissingOrigin: true,
    };

    expect(
      resolveCorsHeaders("https://app.example.com/settings", config),
    ).toMatchObject({
      "Access-Control-Allow-Origin": "https://app.example.com",
      Vary: "Origin",
    });
    expect(resolveCorsHeaders("https://evil.example.com", config)).toBeNull();
    expect(resolveCorsHeaders(null, config)).toMatchObject({ Vary: "Origin" });
  });
});

describe("isRedirectStatus", () => {
  it("identifies upstream redirects that must not be auto-followed", () => {
    expect(isRedirectStatus(299)).toBe(false);
    expect(isRedirectStatus(300)).toBe(true);
    expect(isRedirectStatus(302)).toBe(true);
    expect(isRedirectStatus(308)).toBe(true);
    expect(isRedirectStatus(400)).toBe(false);
  });
});
