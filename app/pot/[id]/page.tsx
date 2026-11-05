"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { formatEther, parseEther, parseAbiItem } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import RoundTableView, { SeatData } from "@/components/table/RoundTableView";
import { COVER_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatCoverError } from "@/lib/errors";
import { formatAddress, maxClaim, canSettle } from "@/lib/mutual";
import { assertActiveChain } from "@/lib/useChainWrite";

interface PoolData {
  creator: string;
  endsAt: bigint;
  joinFee: bigint;
  pool: bigint;
  waitSecs: number;
  voteSecs: number;
  maxClaimBps: number;
  memberCount: number;
  closed: boolean;
  claimCount: number;
  name: string;
}

interface ClaimInfo {
  claimNo: number;
  claimant: string;
  openedAt: bigint;
  closesAt: bigint;
  amount: bigint;
  filedBlock: number;
  yes: number;
  no: number;
  eligible: number;
  open: boolean;
  reason: string;
}

export default function PotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const poolId = BigInt(resolvedParams.id);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;

  const [pool, setPool] = useState<PoolData | null>(null);
  const [members, setMembers] = useState<SeatData[]>([]);
  const [claim, setClaim] = useState<ClaimInfo | null>(null);
  const [userJoinedAt, setUserJoinedAt] = useState<bigint>(0n);
  const [userHasVoted, setUserHasVoted] = useState<boolean>(false);

  // Form states for filing a claim
  const [claimAmountEth, setClaimAmountEth] = useState("");
  const [claimReason, setClaimReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<bigint>(BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchPoolData = async () => {
    if (!publicClient || contractAddress === "0x0000000000000000000000000000000000000000") {
      setLoading(false);
      return;
    }

    try {
      const pData = await publicClient.readContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "poolOf",
        args: [poolId],
      });

      setPool({
        creator: pData.creator,
        endsAt: pData.endsAt,
        joinFee: pData.joinFee,
        pool: pData.pool,
        waitSecs: pData.waitSecs,
        voteSecs: pData.voteSecs,
        maxClaimBps: pData.maxClaimBps,
        memberCount: pData.memberCount,
        closed: pData.closed,
        claimCount: pData.claimCount,
        name: pData.name,
      });

      const memberAddrs = await publicClient.readContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "membersOf",
        args: [poolId],
      });

      // Fetch joinedAt for each member
      const joinedAts = await Promise.all(
        memberAddrs.map((m) =>
          publicClient.readContract({
            address: contractAddress,
            abi: COVER_ABI,
            functionName: "joinedAt",
            args: [poolId, m],
          })
        )
      );

      // Latest claim
      let activeClaim: ClaimInfo | null = null;
      if (pData.claimCount > 0) {
        const cNo = pData.claimCount;
        const cData = await publicClient.readContract({
          address: contractAddress,
          abi: COVER_ABI,
          functionName: "claimOf",
          args: [poolId, cNo],
        });

        // Reason from logs (Spec §4: fromBlock = toBlock = filedBlock)
        let reasonStr = "reason unavailable";
        try {
          const logs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem(
              "event Filed(uint256 indexed id, uint32 indexed claimNo, address indexed claimant, uint128 amount, uint64 closesAt, uint8 eligible, string reason)"
            ),
            args: { id: poolId, claimNo: cNo },
            fromBlock: BigInt(cData.filedBlock),
            toBlock: BigInt(cData.filedBlock),
          });
          if (logs.length > 0 && logs[0].args.reason) {
            reasonStr = logs[0].args.reason;
          }
        } catch {
          // Keep "reason unavailable" fallback per spec
        }

        activeClaim = {
          claimNo: cNo,
          claimant: cData.claimant,
          openedAt: cData.openedAt,
          closesAt: cData.closesAt,
          amount: cData.amount,
          filedBlock: cData.filedBlock,
          yes: cData.yes,
          no: cData.no,
          eligible: cData.eligible,
          open: cData.open,
          reason: reasonStr,
        };
      }

      setClaim(activeClaim);

      // Build seat list
      const seatList: SeatData[] = await Promise.all(
        memberAddrs.map(async (m, idx) => {
          const jAt = joinedAts[idx];
          const isCreator = m.toLowerCase() === pData.creator.toLowerCase();
          const isClaimant = activeClaim ? m.toLowerCase() === activeClaim.claimant.toLowerCase() : false;

          let canVote = false;
          let ineligibleReason: string | undefined = undefined;

          if (activeClaim && activeClaim.open) {
            if (isClaimant) {
              canVote = false;
              ineligibleReason = "Claimant cannot vote";
            } else if (jAt >= activeClaim.openedAt) {
              canVote = false;
              ineligibleReason = "Joined after claim opened";
            } else {
              canVote = true;
            }
          }

          let voted = false;
          let voteChoice: boolean | undefined = undefined;

          if (activeClaim) {
            voted = await publicClient.readContract({
              address: contractAddress,
              abi: COVER_ABI,
              functionName: "hasVoted",
              args: [poolId, activeClaim.claimNo, m],
            });
          }

          return {
            address: m,
            isCreator,
            isClaimant,
            joinedAt: jAt,
            canVote,
            ineligibleReason,
            hasVoted: voted,
            voteChoice,
          };
        })
      );

      setMembers(seatList);

      if (address) {
        const uJoined = await publicClient.readContract({
          address: contractAddress,
          abi: COVER_ABI,
          functionName: "joinedAt",
          args: [poolId, address],
        });
        setUserJoinedAt(uJoined);

        if (activeClaim) {
          const uVoted = await publicClient.readContract({
            address: contractAddress,
            abi: COVER_ABI,
            functionName: "hasVoted",
            args: [poolId, activeClaim.claimNo, address],
          });
          setUserHasVoted(uVoted);
        } else {
          setUserHasVoted(false);
        }
      } else {
        setUserJoinedAt(0n);
        setUserHasVoted(false);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load pot data:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolData();
    const interval = setInterval(fetchPoolData, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId, contractAddress, address]);

  // Actions
  const handleJoin = async () => {
    if (!walletClient || !publicClient || !pool) return;
    setError(null);
    setFeedback(null);
    setActionPending(true);

    try {
      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "join",
        args: [poolId],
        value: pool.joinFee,
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback("You successfully joined the pot!");
      await fetchPoolData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !publicClient || !pool) return;
    setError(null);
    setFeedback(null);
    setActionPending(true);

    try {
      const amt = parseEther(claimAmountEth);
      const maxAllowed = maxClaim(pool.pool, pool.maxClaimBps);
      if (amt <= 0n || amt > maxAllowed) {
        throw new Error(`Claim amount must be between 0 and ${formatEther(maxAllowed)} BOT.`);
      }

      const trimmedReason = claimReason.trim();
      if (!trimmedReason) throw new Error("Please specify a reason for your claim.");
      if (new TextEncoder().encode(trimmedReason).length > 300) {
        throw new Error("Reason must be 300 bytes or fewer.");
      }

      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "file",
        args: [poolId, amt, trimmedReason],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback("Claim filed successfully! The table can now vote.");
      setClaimAmountEth("");
      setClaimReason("");
      await fetchPoolData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleVote = async (yes: boolean) => {
    if (!walletClient || !publicClient) return;
    setError(null);
    setFeedback(null);
    setActionPending(true);

    try {
      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "vote",
        args: [poolId, yes],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback(`Your vote (${yes ? "YES" : "NO"}) has been recorded!`);
      await fetchPoolData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleSettle = async () => {
    if (!walletClient || !publicClient) return;
    setError(null);
    setFeedback(null);
    setActionPending(true);

    try {
      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "settle",
        args: [poolId],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback("Claim settled on chain!");
      await fetchPoolData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleCloseOut = async () => {
    if (!walletClient || !publicClient) return;
    setError(null);
    setFeedback(null);
    setActionPending(true);

    try {
      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "closeOut",
        args: [poolId],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback("Pot closed out! Remaining funds credited equally to members.");
      await fetchPoolData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setActionPending(false);
    }
  };

  if (loading && !pool) {
    return (
      <PageShell title="Loading Pot…">
        <Panel>
          <div className="py-16 text-center font-mono text-sm text-[var(--text-muted)] animate-pulse">
            Loading round table data from chain…
          </div>
        </Panel>
      </PageShell>
    );
  }

  if (!pool) {
    return (
      <PageShell title="Pot Not Found">
        <Panel>
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            Pot #{poolId.toString()} does not exist.
          </div>
        </Panel>
      </PageShell>
    );
  }

  const isMember = userJoinedAt > 0n;
  const poolEth = formatEther(pool.pool);
  const joinFeeEth = formatEther(pool.joinFee);
  const maxClaimEth = formatEther(maxClaim(pool.pool, pool.maxClaimBps));

  // Waiting period check
  const readyAt = userJoinedAt + BigInt(pool.waitSecs);
  const canFileNow = currentTime >= readyAt;
  const isSeasonEnded = currentTime >= pool.endsAt;

  // Claim eligibility for user
  const isClaimant = claim && address && claim.claimant.toLowerCase() === address.toLowerCase();
  const joinedAfterClaim = claim && userJoinedAt >= claim.openedAt;
  const userEligibleToVote = isMember && claim?.open && !isClaimant && !joinedAfterClaim;

  // Settleable check
  const settleable = claim ? canSettle(claim, currentTime) : false;
  const willPass = claim ? claim.yes * 2 > claim.eligible : false;

  // Season progress
  const totalDurationSecs = Number(pool.endsAt - (pool.endsAt - BigInt(30 * 86400))); // approx
  const remainingSecs = Math.max(0, Number(pool.endsAt - currentTime));
  const daysLeft = Math.ceil(remainingSecs / 86400);

  return (
    <PageShell
      title={pool.name}
      subtitle={`Pot #${poolId.toString()} • Fee: ${joinFeeEth} BOT • Max Claim: ${pool.maxClaimBps / 100}% • ${pool.memberCount}/50 Members`}
    >
      <div className="flex flex-col gap-6">
        {/* Back navigation */}
        <div>
          <Link
            href="/"
            className="text-xs font-sans uppercase font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            ← Back to Pots
          </Link>
        </div>

        {/* Not a member join banner */}
        {!isMember && !pool.closed && !isSeasonEnded && (
          <Panel tone="tinted">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">
                  {pool.memberCount >= 50 ? "Pot is Full" : "Join this Shared Pot"}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans">
                  {pool.memberCount >= 50
                    ? "Maximum of 50 members reached."
                    : `Deposit the fixed fee of ${joinFeeEth} BOT to become an equal member.`}
                </p>
              </div>
              {pool.memberCount < 50 && (
                <Button
                  size="md"
                  variant="primary"
                  disabled={actionPending || !isConnected}
                  onClick={handleJoin}
                >
                  {actionPending
                    ? "Joining…"
                    : isConnected
                    ? `Join for ${joinFeeEth} BOT`
                    : "Connect Wallet to Join"}
                </Button>
              )}
            </div>
          </Panel>
        )}

        {/* Season Closed Out Alert */}
        {pool.closed && (
          <Panel tone="tinted">
            <div className="py-2 text-center text-xs font-sans text-[var(--text-primary)] font-semibold">
              This pot has ended and was closed out. All remaining funds have been distributed equally to members.
            </div>
          </Panel>
        )}

        {/* Season ended close out button */}
        {!pool.closed && isSeasonEnded && (
          <Panel tone="tinted">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-base font-bold text-[var(--text-primary)]">
                  Season Has Concluded
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans">
                  The season duration elapsed. Close out the pot to split the remaining {poolEth} BOT equally among all {pool.memberCount} members.
                </p>
              </div>
              <Button
                size="md"
                variant="primary"
                disabled={actionPending || (claim?.open ?? false)}
                onClick={handleCloseOut}
              >
                {actionPending ? "Closing Out…" : "Close Out Pot"}
              </Button>
            </div>
          </Panel>
        )}

        {/* Feedback / Error Alerts */}
        {feedback && (
          <div className="p-3 rounded bg-[var(--success)]/15 border border-[var(--success)] text-xs text-[var(--success)]">
            {feedback}
          </div>
        )}
        {error && (
          <div className="p-3 rounded bg-[var(--danger)]/15 border border-[var(--danger)] text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Visual Round Table (Archetype AU) */}
        <RoundTableView
          members={members}
          poolEth={poolEth}
          claim={
            claim
              ? {
                  claimant: claim.claimant,
                  amountEth: formatEther(claim.amount),
                  yes: claim.yes,
                  no: claim.no,
                  eligible: claim.eligible,
                  open: claim.open,
                  reasonText: claim.reason,
                }
              : null
          }
          seasonProgressPercent={
            isSeasonEnded ? 100 : Math.max(10, 100 - (remainingSecs / (30 * 86400)) * 100)
          }
          timeRemaining={
            pool.closed
              ? "Closed"
              : isSeasonEnded
              ? "Season ended"
              : `${daysLeft} days remaining`
          }
        />

        {/* Open Claim Card on the Table (Spec §3.1, §3.4) */}
        {claim && claim.open && (
          <Panel
            tone="table"
            heading="Active Claim on the Table"
            subheading={`Claim #${claim.claimNo} • ${claim.yes} yes, ${claim.no} no, ${
              claim.eligible - claim.yes - claim.no
            } not voted`}
          >
            <div className="flex flex-col gap-4">
              {/* Claim Details */}
              <div className="p-3.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span>
                    Claimant: <strong>{formatAddress(claim.claimant)}</strong>
                    {isClaimant && " (You)"}
                  </span>
                  <span className="font-mono text-sm font-bold text-[var(--accent)]">
                    {formatEther(claim.amount)} BOT
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] italic bg-[var(--bg-elevated)] p-2.5 rounded border border-[var(--border-subtle)]">
                  &ldquo;{claim.reason}&rdquo;
                </div>
              </div>

              {/* Voting Controls */}
              {userEligibleToVote && !userHasVoted && currentTime < claim.closesAt && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Cast your peer vote:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={actionPending}
                      onClick={() => handleVote(true)}
                    >
                      Vote YES
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={actionPending}
                      onClick={() => handleVote(false)}
                    >
                      Vote NO
                    </Button>
                  </div>
                </div>
              )}

              {userHasVoted && (
                <div className="text-center py-2 text-xs font-mono text-[var(--success)] font-semibold">
                  ✓ You have cast your vote on this claim.
                </div>
              )}

              {!userEligibleToVote && (
                <div className="text-center py-2 text-xs font-sans text-[var(--text-muted)]">
                  {isClaimant
                    ? "Claimants cannot vote on their own claim."
                    : joinedAfterClaim
                    ? "You joined after this claim opened and are not eligible to vote."
                    : "Voting is restricted to eligible members."}
                </div>
              )}

              {/* Settle Action */}
              {settleable && (
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-3">
                  <div className="text-xs">
                    Outcome mathematically certain:{" "}
                    <strong className={willPass ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                      {willPass ? "PASSED (Payout ready)" : "FAILED (Rejected)"}
                    </strong>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionPending}
                    onClick={handleSettle}
                  >
                    {actionPending ? "Settling…" : "Settle Claim"}
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* File Claim Section for Members */}
        {isMember && !pool.closed && !isSeasonEnded && (!claim || !claim.open) && (
          <Panel
            heading="File a Claim"
            subheading={`Maximum payout: ${maxClaimEth} BOT (${pool.maxClaimBps / 100}% of current pot)`}
          >
            {canFileNow ? (
              <form onSubmit={handleFileClaim} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="claim-amount"
                    className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                  >
                    Claim Amount (BOT)
                  </label>
                  <input
                    id="claim-amount"
                    type="number"
                    step="any"
                    min="0.0001"
                    max={maxClaimEth}
                    required
                    value={claimAmountEth}
                    onChange={(e) => setClaimAmountEth(e.target.value)}
                    placeholder={`e.g. 1.0 (max ${maxClaimEth} BOT)`}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="claim-reason"
                    className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                  >
                    Reason / Description (Max 300 bytes)
                  </label>
                  <textarea
                    id="claim-reason"
                    required
                    maxLength={300}
                    rows={3}
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="Describe your emergency or loss so members can vote."
                    className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    {new TextEncoder().encode(claimReason).length} / 300 bytes
                  </span>
                </div>

                <Button
                  type="submit"
                  size="md"
                  variant="primary"
                  disabled={actionPending}
                >
                  {actionPending ? "Submitting Claim…" : "Submit Claim to Table"}
                </Button>
              </form>
            ) : (
              <div className="py-4 text-xs font-sans text-[var(--text-muted)] text-center">
                Waiting period active. You can file from{" "}
                <strong>{new Date(Number(readyAt) * 1000).toLocaleString()}</strong>.
              </div>
            )}
          </Panel>
        )}
      </div>
    </PageShell>
  );
}
