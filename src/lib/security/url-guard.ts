const LOOPBACK_HOSTNAMES = new Set(["localhost", "localhost."]);
const INTERNAL_HOST_SUFFIXES = [".localhost", ".internal", ".local"];
const METADATA_HOSTNAMES = new Set(["metadata.google.internal"]);

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Asserts that a URL is safe to fetch from a server context.
 * Throws UnsafeUrlError for private/loopback/link-local/metadata addresses.
 * Does not perform DNS resolution — guards against literal IPs and known internal hostnames.
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Only HTTPS URLs are allowed");
  }

  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError("URLs with credentials are not allowed");
  }

  const hostname = normalizeHostname(parsed.hostname);

  if (!hostname) {
    throw new UnsafeUrlError("Missing hostname");
  }

  if (isBlockedHostname(hostname)) {
    throw new UnsafeUrlError("Private or internal hostnames are not allowed");
  }

  const literalIp = parseIpLiteral(hostname);
  if (literalIp && isBlockedIp(literalIp)) {
    throw new UnsafeUrlError("Private or loopback IP addresses are not allowed");
  }
}

function normalizeHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function isBlockedHostname(hostname: string): boolean {
  return (
    LOOPBACK_HOSTNAMES.has(hostname) ||
    METADATA_HOSTNAMES.has(hostname) ||
    INTERNAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}

type IpLiteral =
  | { family: "ipv4"; octets: [number, number, number, number] }
  | { family: "ipv6"; normalized: string };

function parseIpLiteral(hostname: string): IpLiteral | null {
  const ipv4 = parseIpv4(hostname);
  if (ipv4) return { family: "ipv4", octets: ipv4 };
  if (hostname.includes(":")) return { family: "ipv6", normalized: hostname };
  return null;
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    return value >= 0 && value <= 255 ? value : null;
  });
  if (octets.some((o) => o === null)) return null;
  return octets as [number, number, number, number];
}

function isBlockedIp(ip: IpLiteral): boolean {
  if (ip.family === "ipv6") return isBlockedIpv6(ip.normalized);
  const [a, b] = ip.octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isBlockedIpv6(hostname: string): boolean {
  const groups = expandIpv6(hostname);
  if (!groups) return true;

  const isUnspecified = groups.every((g) => g === 0);
  const isLoopback = groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1;
  const isUniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const isLinkLocal = (groups[0] & 0xffc0) === 0xfe80;

  const isIpv4Mapped =
    groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  if (isIpv4Mapped) {
    return isBlockedIp({
      family: "ipv4",
      octets: [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff],
    });
  }

  return isUnspecified || isLoopback || isUniqueLocal || isLinkLocal;
}

function expandIpv6(hostname: string): number[] | null {
  const normalized = hostname.toLowerCase();
  const [left = "", right = ""] = normalized.split("::");
  const hasCompression = normalized.includes("::");

  if (normalized.split("::").length > 2) return null;

  const leftGroups = left ? parseIpv6Groups(left.split(":")) : [];
  const rightGroups = right ? parseIpv6Groups(right.split(":")) : [];
  if (!leftGroups || !rightGroups) return null;

  if (!hasCompression) {
    return leftGroups.length === 8 ? leftGroups : null;
  }

  const missingGroups = 8 - leftGroups.length - rightGroups.length;
  if (missingGroups < 1) return null;

  return [...leftGroups, ...Array.from({ length: missingGroups }, () => 0), ...rightGroups];
}

function parseIpv6Groups(groups: string[]): number[] | null {
  const parsed = groups.map((group) => {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    return parseInt(group, 16);
  });
  if (parsed.some((g) => g === null)) return null;
  return parsed as number[];
}
