"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { COVER_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { formatCoverError } from "@/lib/errors";
import { assertActiveChain } from "@/lib/useChainWrite";

export default function NewPotPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;

  const [name, setName] = useState("");
  const [joinFeeEth, setJoinFeeEth] = useState("1");
  const [waitDays, setWaitDays] = useState("1");
  const [voteDays, setVoteDays] = useState("3");
  const [maxClaimPercent, setMaxClaimPercent] = useState("25");
  const [termDays, setTermDays] = useState("30");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletClient || !publicClient) return;

    setError(null);
    setLoading(true);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Please enter a pot name.");
      if (new TextEncoder().encode(trimmedName).length > 48) {
        throw new Error("Name must be 48 bytes or fewer.");
      }

      const parsedFee = parseEther(joinFeeEth);
      if (parsedFee < parseEther("0.01") || parsedFee > parseEther("1000")) {
        throw new Error("Join fee must be between 0.01 and 1000 BOT.");
      }

      const waitSecs = Number(waitDays) * 86400;
      if (waitSecs < 3600 || waitSecs > 90 * 86400) {
        throw new Error("Waiting period must be between 1 hour and 90 days.");
      }

      const voteSecs = Number(voteDays) * 86400;
      if (voteSecs < 3600 || voteSecs > 14 * 86400) {
        throw new Error("Voting window must be between 1 hour and 14 days.");
      }

      const claimPercentNum = Number(maxClaimPercent);
      if (claimPercentNum < 1 || claimPercentNum > 50) {
        throw new Error("Max claim must be between 1% and 50%.");
      }
      const maxClaimBps = claimPercentNum * 100;

      const termSecs = BigInt(Number(termDays) * 86400);
      if (termSecs < 7n * 86400n || termSecs > 365n * 86400n) {
        throw new Error("Season length must be between 7 days and 365 days.");
      }

      await assertActiveChain(walletClient);

      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "create",
        args: [
          trimmedName,
          parsedFee,
          waitSecs,
          voteSecs,
          maxClaimBps,
          termSecs,
        ],
        value: parsedFee,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const nextId = await publicClient.readContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "poolCount",
      });

      router.push(`/pot/${nextId.toString()}`);
    } catch (err: unknown) {
      console.error(err);
      setError(formatCoverError(err));
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Open a Shared Pot"
      subtitle="Establish a mutual aid or emergency reserve pot with peer voting."
    >
      <div className="max-w-xl mx-auto">
        <Panel
          heading="Pot Parameters"
          subheading="Set equal join fee, waiting period, claim limit, and season term"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="pot-name"
                className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
              >
                Pot Name (Max 48 bytes)
              </label>
              <input
                id="pot-name"
                type="text"
                required
                maxLength={48}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cyclists Mutual Reserve"
                className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-sans text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {new TextEncoder().encode(name).length} / 48 bytes
              </span>
            </div>

            {/* Join Fee */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="join-fee"
                className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
              >
                Member Join Fee (BOT)
              </label>
              <input
                id="join-fee"
                type="number"
                step="any"
                min="0.01"
                max="1000"
                required
                value={joinFeeEth}
                onChange={(e) => setJoinFeeEth(e.target.value)}
                placeholder="1.0"
                className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[11px] font-sans text-[var(--text-muted)]">
                Range: 0.01 to 1000 BOT. You deposit this first fee when opening the pot as member #1.
              </span>
            </div>

            {/* Grid of parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Waiting Period */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="wait-days"
                  className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                >
                  Waiting Period (Days)
                </label>
                <input
                  id="wait-days"
                  type="number"
                  step="any"
                  min="0.05"
                  max="90"
                  required
                  value={waitDays}
                  onChange={(e) => setWaitDays(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">
                  Min 1 hr, max 90 days. Time before new members can file.
                </span>
              </div>

              {/* Voting Window */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="vote-days"
                  className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                >
                  Voting Window (Days)
                </label>
                <input
                  id="vote-days"
                  type="number"
                  step="any"
                  min="0.05"
                  max="14"
                  required
                  value={voteDays}
                  onChange={(e) => setVoteDays(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">
                  Min 1 hr, max 14 days. Window for eligible members to vote.
                </span>
              </div>

              {/* Max Claim Percent */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="max-claim"
                  className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                >
                  Max Claim Share (% of Pot)
                </label>
                <input
                  id="max-claim"
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  required
                  value={maxClaimPercent}
                  onChange={(e) => setMaxClaimPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">
                  1% to 50%. Limits single payout size.
                </span>
              </div>

              {/* Season Term */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="term-days"
                  className="text-xs font-sans uppercase font-bold text-[var(--text-primary)]"
                >
                  Season Length (Days)
                </label>
                <input
                  id="term-days"
                  type="number"
                  step="1"
                  min="7"
                  max="365"
                  required
                  value={termDays}
                  onChange={(e) => setTermDays(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[10px] text-[var(--text-muted)]">
                  7 to 365 days. Unspent pot is split equally at the end.
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-[var(--danger)]/15 border border-[var(--danger)] text-xs text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={loading || !isConnected}
                className="w-full"
              >
                {loading
                  ? "Opening Pot on Chain…"
                  : isConnected
                  ? `Open Pot & Pay ${joinFeeEth} BOT`
                  : "Connect Wallet to Open Pot"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </PageShell>
  );
}
