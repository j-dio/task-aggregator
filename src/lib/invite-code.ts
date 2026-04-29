// 31 printable chars: no 0/O/1/I/L to prevent misreads
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates a cryptographically random invite code.
 * Uses rejection sampling to eliminate modulo bias: ALPHABET has 31 chars,
 * 256 % 31 = 8, so bytes 248–255 are discarded to keep each char equally likely.
 */
export function generateInviteCode(length = 12): string {
  const chars: string[] = [];
  while (chars.length < length) {
    const batch = new Uint8Array(length * 2);
    crypto.getRandomValues(batch);
    for (const byte of batch) {
      if (byte < 248) {
        chars.push(INVITE_CODE_ALPHABET[byte % 31]!);
        if (chars.length === length) break;
      }
    }
  }
  return chars.join("");
}
