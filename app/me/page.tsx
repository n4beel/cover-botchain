"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { COVER_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatCoverError } from "@/lib/errors";
import { assertActiveChain } from "@/lib/useChainWrite";

interface MyPot {
  id: bigint;
  name: string;
  memberCount: number;
  pool: bigint;
  closed: boolean;
  joinedAt: bigint;
}

export default function MemberDashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;

  const [pendingBalance, setPendingBalance] = useState<bigint>(0n);
  const [pots, setPots] = useState<MyPot[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!publicClient || !address || contractAddress === "0x0000000000000000000000000000000000000000") {
      setLoading(false);
      return;
    }

    try {
      // 1. Pending balance
      const bal = await publicClient.readContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "pending",
        args: [address],
      });
      setPendingBalance(bal);

      // 2. Scan pots for user membership
      const totalCount = await publicClient.readContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "poolCount",
      });

      const total = Number(totalCount);
      const userPots: MyPot[] = [];

      for (let i = 1; i <= total; i++) {
        const pId = BigInt(i);
        const joined = await publicClient.readContract({
          address: contractAddress,
          abi: COVER_ABI,
          functionName: "joinedAt",
          args: [pId, address],
        });

        if (joined > 0n) {
          const pInfo = await publicClient.readContract({
            address: contractAddress,
            abi: COVER_ABI,
            functionName: "poolOf",
            args: [pId],
          });

          userPots.push({
            id: pId,
            name: pInfo.name,
            memberCount: pInfo.memberCount,
            pool: pInfo.pool,
            closed: pInfo.closed,
            joinedAt: joined,
          });
        }
      }

      setPots(userPots);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load user dashboard:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    const interval = setInterval(fetchUserData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contractAddress]);

  const handleWithdraw = async () => {
    if (!walletClient || !publicClient) return;
    setError(null);
    setFeedback(null);
    setWithdrawing(true);

    try {
      await assertActiveChain(walletClient);
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "withdraw",
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setFeedback("Payout withdrawn successfully to your wallet!");
      await fetchUserData();
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <PageShell
      title="Member Dashboard"
      subtitle="View your pot memberships, claim payouts, and withdraw settled balances."
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Withdrawable Balance */}
        <Panel
          heading="Withdrawable Balance"
          subheading="Approved claim payouts or closed-out season distributions"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
            <div>
              <span className="font-mono text-3xl sm:text-4xl font-bold text-[var(--accent)]">
                {formatEther(pendingBalance)} BOT
              </span>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
                {pendingBalance > 0n
                  ? "Available for immediate withdrawal via pull payment."
                  : "No pending payouts."}
              </p>
            </div>
            {pendingBalance > 0n && (
              <Button
                size="md"
                variant="primary"
                disabled={withdrawing || !isConnected}
                onClick={handleWithdraw}
              >
                {withdrawing ? "Withdrawing…" : "Withdraw to Wallet"}
              </Button>
            )}
          </div>
        </Panel>

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

        {/* Pots you belong to */}
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Your Pots
          </h2>
          {loading ? (
            <Panel>
              <div className="py-6 text-center font-mono text-xs text-[var(--text-muted)] animate-pulse">
                Fetching your pot memberships…
              </div>
            </Panel>
          ) : pots.length === 0 ? (
            <Panel>
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                You haven&apos;t joined any pots yet. Browse active pots or open your own.
              </div>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pots.map((p) => (
                <Link
                  key={p.id.toString()}
                  href={`/pot/${p.id.toString()}`}
                  className="group no-underline block"
                >
                  <Panel className="hover:border-[var(--accent)] transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-serif font-bold text-sm text-[var(--text-primary)] truncate">
                        {p.name}
                      </span>
                      <span
                        className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded ${
                          p.closed
                            ? "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                            : "bg-[var(--bg-overlay)] text-[var(--accent)]"
                        }`}
                      >
                        {p.closed ? "Closed" : "Active"}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[var(--text-muted)] flex justify-between items-center">
                      <span>Pot #{p.id.toString()} • {p.memberCount} Members</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {formatEther(p.pool)} BOT
                      </span>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
