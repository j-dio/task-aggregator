export const DEFAULT_ALLOWED_METHODS = "GET, OPTIONS";
export const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "localhost."]);
const INTERNAL_HOST_SUFFIXES = [".localhost", ".internal", ".local"];
const METADATA_HOSTNAMES = new Set(["metadata.google.internal"]);


export interface CorsConfig {
  allowedOrigins: string[];
  allowMissingOrigin: boolean;
}

export interface UrlValidationOptions {
  resolvedAddresses?: string[];
}

export interface UrlValidationResult {
  allowed: boolean;
  reason?: string;
  hostname?: string;
}

export type CorsHeaders = Record<string, string>;

export function parseAllowedOrigins(
  env: Record<string, string | undefined>,
): string[] {
  const candidates = [
    env.UVEC_PROXY_ALLOWED_ORIGINS,
    env.SITE_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.PUBLIC_SITE_URL,
  ];

  return [
    ...new Set(
      candidates
        .flatMap((value) => value?.split(",") ?? [])
        .map((origin) => normalizeOrigin(origin))
        .filter((origin): origin is string => Boolean(origin)),
    ),
  ];
}

export function resolveCorsHeaders(
  requestOrigin: string | null,
  config: CorsConfig,
): CorsHeaders | null {
  const baseHeaders = {
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    Vary: "Origin",
  };

  if (!requestOrigin) {
    return config.allowMissingOrigin ? baseHeaders : null;
  }

  const normalizedOrigin = normalizeOrigin(requestOrigin);
  if (!normalizedOrigin || !config.allowedOrigins.includes(normalizedOrigin)) {
    return null;
  }

  return {
    ...baseHeaders,
    "Access-Control-Allow-Origin": normalizedOrigin,
  };
}

export function validateUvecUrl(
  targetUrl: string,
  options: UrlValidationOptions = {},
): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: "invalid-url" };
  }

  if (parsed.protocol !== "https:") {
    return { allowed: false, reason: "invalid-scheme" };
  }

  if (parsed.username || parsed.password) {
    return { allowed: false, reason: "credentials-not-allowed" };
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    return { allowed: false, reason: "missing-hostname" };
  }

  if (isBlockedHostname(hostname)) {
    return { allowed: false, reason: "blocked-hostname", hostname };
  }

  const literalIp = parseIpLiteral(hostname);
  if (literalIp && isBlockedIp(literalIp)) {
    return { allowed: false, reason: "blocked-ip", hostname };
  }

  for (const address of options.resolvedAddresses ?? []) {
    const resolvedIp = parseIpLiteral(address);
    if (!resolvedIp || isBlockedIp(resolvedIp)) {
      return { allowed: false, reason: "blocked-resolved-ip", hostname };
    }
  }

  return { allowed: true, hostname };
}

export function isIpAddressLiteral(hostname: string): boolean {
  return parseIpLiteral(hostname) !== null;
}

export function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function normalizeOrigin(origin: string | undefined): string | null {
  if (!origin) return null;

  try {
    return new URL(origin.trim()).origin;
  } catch {
    return null;
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
  const normalized = normalizeHostname(hostname);
  const ipv4 = parseIpv4(normalized);
  if (ipv4) return { family: "ipv4", octets: ipv4 };

  if (normalized.includes(":")) {
    return { family: "ipv6", normalized };
  }

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

  if (octets.some((octet) => octet === null)) return null;
  return octets as [number, number, number, number];
}

function isBlockedIp(ip: IpLiteral): boolean {
  if (ip.family === "ipv6") {
    return isBlockedIpv6(ip.normalized);
  }

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

  const isUnspecified = groups.every((group) => group === 0);
  const isLoopback =
    groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  const isUniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const isLinkLocal = (groups[0] & 0xffc0) === 0xfe80;

  const isIpv4Mapped =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (isIpv4Mapped) {
    return isBlockedIp({
      family: "ipv4",
      octets: [
        groups[6] >> 8,
        groups[6] & 0xff,
        groups[7] >> 8,
        groups[7] & 0xff,
      ],
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

  return [
    ...leftGroups,
    ...Array.from({ length: missingGroups }, () => 0),
    ...rightGroups,
  ];
}

function parseIpv6Groups(groups: string[]): number[] | null {
  const parsed = groups.map((group) => {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    return parseInt(group, 16);
  });

  if (parsed.some((group) => group === null)) return null;
  return parsed as number[];
}
