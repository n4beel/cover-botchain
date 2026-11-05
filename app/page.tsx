"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { COVER_ABI } from "@/lib/botchain/abi";
import { activeBotChain } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";

interface PoolSummary {
  id: bigint;
  name: string;
  creator: string;
  endsAt: bigint;
  joinFee: bigint;
  pool: bigint;
  memberCount: number;
  closed: boolean;
  userIsMember: boolean;
}

export default function HomePage() {
  const { address } = useAccount();
  const deployment = getDeployment(activeBotChain.id);
  const contractAddress = deployment.address;
  const isDeployed = contractAddress !== "0x0000000000000000000000000000000000000000";

  const publicClient = usePublicClient({ chainId: activeBotChain.id });

  const [pools, setPools] = useState<PoolSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient || !isDeployed) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPools() {
      try {
        const count = await publicClient!.readContract({
          address: contractAddress,
          abi: COVER_ABI,
          functionName: "poolCount",
        });

        const total = Number(count);
        if (total === 0) {
          if (isMounted) {
            setPools([]);
            setLoading(false);
          }
          return;
        }

        const list: PoolSummary[] = [];
        const limit = Math.min(total, 30);

        for (let i = total; i > total - limit; i--) {
          const pId = BigInt(i);
          const [pData, userJoined] = await Promise.all([
            publicClient!.readContract({
              address: contractAddress,
              abi: COVER_ABI,
              functionName: "poolOf",
              args: [pId],
            }),
            address
              ? publicClient!.readContract({
                  address: contractAddress,
                  abi: COVER_ABI,
                  functionName: "joinedAt",
                  args: [pId, address],
                })
              : Promise.resolve(0n),
          ]);

          list.push({
            id: pId,
            name: pData.name,
            creator: pData.creator,
            endsAt: pData.endsAt,
            joinFee: pData.joinFee,
            pool: pData.pool,
            memberCount: pData.memberCount,
            closed: pData.closed,
            userIsMember: userJoined > 0n,
          });
        }

        if (isMounted) {
          list.sort((a, b) => {
            if (a.userIsMember === b.userIsMember) return Number(b.id - a.id);
            return a.userIsMember ? -1 : 1;
          });
          setPools(list);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load pools:", err);
        if (isMounted) setLoading(false);
      }
    }

    loadPools();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress, address]);

  return (
    <PageShell
      title="Shared Risk Pots"
      subtitle="A shared pot. The members decide who gets paid."
    >
      <div className="flex flex-col gap-6">
        {/* Limits & Boundaries Panel (Spec §1, §3.4) */}
        <Panel
          tone="tinted"
          heading="What members decide"
          subheading="Peer governance boundaries and risk-sharing mechanics"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-[var(--text-muted)]">
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Mutual Peer Trust
              </span>
              <p>
                Nothing checks that a claim is true. Members decide, and members can collude. This contract is for groups that already trust one another.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Eligible Majority
              </span>
              <p>
                A claim needs a majority of eligible members. Silence counts against it. Members who joined after a claim opened cannot vote.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="font-serif font-bold text-[var(--accent)] uppercase tracking-wider">
                Season End Split
              </span>
              <p>
                Nobody can leave early. What is left in the pot is split equally among all members at the end of the season.
              </p>
            </div>
          </div>
        </Panel>

        {/* Pots Listing */}
        {loading ? (
          <Panel>
            <div className="py-12 text-center text-sm font-mono text-[var(--text-muted)] animate-pulse">
              Scanning active risk pots on chain…
            </div>
          </Panel>
        ) : !isDeployed ? (
          <Panel>
            <div className="py-12 text-center text-sm text-[var(--warning)] font-sans">
              Cover contract is not yet deployed on this network.
            </div>
          </Panel>
        ) : pools.length === 0 ? (
          <Panel>
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-[var(--text-muted)] font-sans">
                No cover pots have been opened yet. Be the first to start a shared pot!
              </p>
              <Link href="/new">
                <Button size="md">Open the First Pot</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Active Pots
              </h2>
              <Link href="/new">
                <Button size="sm">＋ Open Pot</Button>
              </Link>
            </div>

            {/* List of small tables (Spec §3.1: seat dots on a ring, pool amount) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pools.map((p) => {
                const now = BigInt(Math.floor(Date.now() / 1000));
                const isEnded = now >= p.endsAt || p.closed;

                return (
                  <Link
                    key={p.id.toString()}
                    href={`/pot/${p.id.toString()}`}
                    className="group no-underline block"
                  >
                    <Panel
                      className="h-full hover:border-[var(--accent)] transition-all cursor-pointer"
                      heading={
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate pr-2">{p.name}</span>
                          {p.userIsMember && (
                            <span className="text-[10px] font-sans uppercase px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-ink)] font-bold shrink-0">
                              Member
                            </span>
                          )}
                        </div>
                      }
                      subheading={`Pot #${p.id.toString()} • Join Fee: ${formatEther(p.joinFee)} BOT`}
                    >
                      <div className="flex items-center gap-4 mt-2">
                        {/* Round Table Stub Icon (seat dots on a ring) */}
                        <div
                          className="w-14 h-14 rounded-full border-2 border-[var(--border-strong)] bg-[var(--bg-elevated)] relative flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          <span className="font-mono text-[10px] font-bold text-[var(--accent)]">
                            {p.memberCount}
                          </span>
                          {/* 4 seat dots on ring */}
                          <div className="absolute top-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                          <div className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                          <div className="absolute left-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                          <div className="absolute right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        </div>

                        {/* Pot stats */}
                        <div className="flex-1 flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--text-muted)] font-sans">Current Pot:</span>
                            <span className="font-mono font-bold text-[var(--text-primary)]">
                              {formatEther(p.pool)} BOT
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--text-muted)] font-sans">Members:</span>
                            <span className="font-mono text-[var(--text-muted)]">
                              {p.memberCount}/50
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[var(--text-muted)] font-sans">Status:</span>
                            <span
                              className={`font-sans font-bold ${
                                isEnded ? "text-[var(--text-muted)]" : "text-[var(--success)]"
                              }`}
                            >
                              {p.closed ? "Closed Out" : isEnded ? "Season Ended" : "Active"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
