import { generateInviteCode, INVITE_CODE_ALPHABET } from "../invite-code";

describe("generateInviteCode", () => {
  it("produces a code of the requested length", () => {
    expect(generateInviteCode(12)).toHaveLength(12);
    expect(generateInviteCode(6)).toHaveLength(6);
    expect(generateInviteCode(1)).toHaveLength(1);
  });

  it("uses only characters from the alphabet", () => {
    const code = generateInviteCode(200);
    for (const ch of code) {
      expect(INVITE_CODE_ALPHABET).toContain(ch);
    }
  });

  it("does not include ambiguous characters (0, O, 1, I, L)", () => {
    const code = generateInviteCode(500);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it("produces uniform distribution — no character appears at > 2x expected rate", () => {
    // 31 chars × 100 samples = 3100 chars; expected count per char ≈ 100
    const n = 31 * 100;
    const code = generateInviteCode(n);
    const counts = new Map<string, number>();
    for (const ch of code) {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
    }
    // All 31 chars must appear
    expect(counts.size).toBe(31);
    // Each count must be well within 3-sigma of expected (very conservative bounds)
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(50);
      expect(count).toBeLessThan(150);
    }
  });

  it("produces distinct codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode(12)));
    expect(codes.size).toBe(20);
  });
});
