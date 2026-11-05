import { describe, it, expect } from "vitest";
import { maxClaim, passes, canSettle, eligibleAt, shares, formatAddress } from "../mutual";
import { parseEther } from "viem";

describe("Cover Math & Reference Models (Spec §4)", () => {
  it("maxClaim computes exact bps of pool", () => {
    // 100 BOT pool, 2500 bps (25%) -> 25 BOT
    expect(maxClaim(parseEther("100"), 2500)).toBe(parseEther("25"));
    // 4 ether pool, 5000 bps (50%) -> 2 ether
    expect(maxClaim(parseEther("4"), 5000)).toBe(parseEther("2"));
    // 1 ether pool, 100 bps (1%) -> 0.01 ether
    expect(maxClaim(parseEther("1"), 100)).toBe(parseEther("0.01"));
  });

  it("passes checks strict majority of eligible members", () => {
    // 3 eligible voters: strict majority > 1.5 => 2 needed
    expect(passes(1, 3)).toBe(false);
    expect(passes(2, 3)).toBe(true);
    expect(passes(3, 3)).toBe(true);

    // 4 eligible voters: strict majority > 2 => 3 needed
    expect(passes(2, 4)).toBe(false);
    expect(passes(3, 4)).toBe(true);
    expect(passes(4, 4)).toBe(true);

    // 5 eligible voters: strict majority > 2.5 => 3 needed
    expect(passes(2, 5)).toBe(false);
    expect(passes(3, 5)).toBe(true);
  });

  it("canSettle identifies when outcome is mathematically certain or window expired", () => {
    const claim = {
      open: true,
      closesAt: 1000n,
      yes: 2,
      no: 0,
      eligible: 3,
    };

    // Strict majority reached early (2 * 2 = 4 > 3)
    expect(canSettle(claim, 500n)).toBe(true);

    // Cannot pass early (no * 2 >= eligible: 2 * 2 = 4 >= 3)
    const rejectEarly = { ...claim, yes: 0, no: 2 };
    expect(canSettle(rejectEarly, 500n)).toBe(true);

    // In progress, neither threshold met before expiration
    const inProgress = { ...claim, yes: 1, no: 1 };
    expect(canSettle(inProgress, 500n)).toBe(false);

    // Time expired allows settling regardless of vote count
    expect(canSettle(inProgress, 1001n)).toBe(true);

    // Closed claim cannot be settled
    expect(canSettle({ ...inProgress, open: false }, 1001n)).toBe(false);
  });

  it("eligibleAt mirrors contract backward scan", () => {
    const members = [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
      "0x4444444444444444444444444444444444444444",
    ];

    const joinedAtMap = {
      [members[0].toLowerCase()]: 100n,
      [members[1].toLowerCase()]: 200n,
      [members[2].toLowerCase()]: 300n,
      [members[3].toLowerCase()]: 500n, // joined after claim opened at 400n
    };

    const claimant = members[1]; // member 1 is claimant
    const openTime = 400n;

    const eligible = eligibleAt(members, joinedAtMap, openTime, claimant);
    // Should contain member 2 and member 0 in backwards order
    expect(eligible.length).toBe(2);
    expect(eligible[0]).toBe(members[2]);
    expect(eligible[1]).toBe(members[0]);
  });

  it("shares calculates equal distribution and remainder", () => {
    // 100 pool, 4 members -> 25 share, 0 remainder
    expect(shares(100n, 4)).toEqual({ share: 25n, remainder: 0n });

    // 100 pool, 3 members -> 33 share, 1 remainder
    expect(shares(100n, 3)).toEqual({ share: 33n, remainder: 1n });

    // 0 members edge case
    expect(shares(100n, 0)).toEqual({ share: 0n, remainder: 100n });
  });

  it("formatAddress shortens addresses", () => {
    expect(formatAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
});
