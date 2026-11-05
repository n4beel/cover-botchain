// lib/mutual.ts - Pure reference models and math for Cover (Spec §2, §4)

/**
 * Calculates the maximum claim amount allowed for a pool.
 * maxAllowed = pool * maxClaimBps / 10000
 */
export function maxClaim(pool: bigint, maxClaimBps: number): bigint {
  return (pool * BigInt(maxClaimBps)) / 10000n;
}

/**
 * Returns true if strict majority of eligible members voted yes:
 * yes * 2 > eligible
 */
export function passes(yes: number, eligible: number): boolean {
  return yes * 2 > eligible;
}

export interface ClaimStateView {
  open: boolean;
  closesAt: bigint;
  yes: number;
  no: number;
  eligible: number;
}

/**
 * Returns true if the claim can be settled:
 * now >= closesAt OR yes * 2 > eligible OR no * 2 >= eligible
 */
export function canSettle(claim: ClaimStateView, now: bigint): boolean {
  if (!claim.open) return false;
  const timeExpired = now >= claim.closesAt;
  const alreadyPassed = claim.yes * 2 > claim.eligible;
  const cannotPass = claim.no * 2 >= claim.eligible;
  return timeExpired || alreadyPassed || cannotPass;
}

/**
 * Mirrors contract's backward scan:
 * members who joined strictly before now, excluding claimant, counted backwards from end
 */
export function eligibleAt(
  members: string[],
  joinedAtMap: Record<string, bigint>,
  now: bigint,
  claimant: string
): string[] {
  const normClaimant = claimant.toLowerCase();
  const eligible: string[] = [];

  for (let i = members.length - 1; i >= 0; i--) {
    const m = members[i];
    const norm = m.toLowerCase();
    const joined = joinedAtMap[norm] ?? 0n;
    if (norm !== normClaimant && joined < now) {
      eligible.push(m);
    }
  }

  return eligible;
}

/**
 * Calculates equal share and remainder when closing out a pool:
 * share = pool / n; remainder = pool % n
 */
export function shares(pool: bigint, n: number): { share: bigint; remainder: bigint } {
  if (n <= 0) return { share: 0n, remainder: pool };
  const count = BigInt(n);
  return {
    share: pool / count,
    remainder: pool % count,
  };
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
