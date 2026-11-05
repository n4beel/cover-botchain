"use client";

import { useState } from "react";
import { formatAddress } from "@/lib/mutual";

export interface SeatData {
  address: string;
  isCreator: boolean;
  isClaimant: boolean;
  joinedAt: bigint;
  canVote: boolean;
  ineligibleReason?: string;
  hasVoted: boolean;
  voteChoice?: boolean;
}

interface RoundTableViewProps {
  members: SeatData[];
  poolEth: string;
  claim?: {
    claimant: string;
    amountEth: string;
    yes: number;
    no: number;
    eligible: number;
    open: boolean;
    reasonText: string;
  } | null;
  seasonProgressPercent?: number;
  timeRemaining?: string;
}

export default function RoundTableView({
  members,
  poolEth,
  claim,
  seasonProgressPercent = 0,
  timeRemaining,
}: RoundTableViewProps) {
  const [showTable, setShowTable] = useState(false);

  // Geometric layout of seats in a circle
  const totalSeats = Math.max(members.length, 1);
  const radius = 135;
  const centerX = 175;
  const centerY = 175;

  return (
    <div className="flex flex-col gap-4">
      {/* Header controls & Mode Toggle */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)] font-mono">
          {members.length} member{members.length === 1 ? "" : "s"} at the table • Pot: {poolEth} BOT
        </span>
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="font-sans font-bold uppercase tracking-wider text-[var(--accent)] hover:underline cursor-pointer"
          aria-pressed={showTable}
        >
          {showTable ? "View Round Table" : "View Accessible Table"}
        </button>
      </div>

      {showTable ? (
        /* Accessible Table Equivalent (Spec §8.3) */
        <div className="overflow-x-auto rounded border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <table className="w-full text-left text-xs font-sans">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Seat</th>
                <th className="py-2.5 px-3">Member Wallet</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Voting Eligibility</th>
                <th className="py-2.5 px-3 text-right">Vote Cast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
              {members.map((seat, index) => (
                <tr key={seat.address} className="hover:bg-[var(--bg-elevated)]/40">
                  <td className="py-2 px-3 font-serif font-bold text-[var(--accent)]">
                    #{index + 1}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {formatAddress(seat.address)}
                    </span>
                    {seat.isCreator && (
                      <span className="ml-2 text-[10px] font-sans uppercase px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[var(--accent)] font-bold">
                        Creator
                      </span>
                    )}
                    {seat.isClaimant && (
                      <span className="ml-2 text-[10px] font-sans uppercase px-1.5 py-0.5 rounded bg-[var(--warning)] text-white font-bold">
                        Claimant
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-sans text-[var(--text-muted)]">
                    Joined {new Date(Number(seat.joinedAt) * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    {seat.canVote ? (
                      <span className="text-[var(--success)] font-semibold">Eligible</span>
                    ) : (
                      <span className="text-[var(--text-muted)] italic">
                        {seat.ineligibleReason || "Ineligible"}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-sans">
                    {seat.hasVoted ? (
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          seat.voteChoice
                            ? "bg-[var(--success)]/20 text-[var(--success)]"
                            : "bg-[var(--danger)]/20 text-[var(--danger)]"
                        }`}
                      >
                        {seat.voteChoice ? "YES" : "NO"}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Round Table Archetype (Spec §3.1) */
        <div className="relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-6 overflow-hidden flex flex-col items-center">
          {/* Round Table SVG Representation */}
          <div className="relative w-full max-w-[350px] aspect-square flex items-center justify-center">
            <svg
              viewBox="0 0 350 350"
              className="w-full h-full select-none"
              role="img"
              aria-label="Interactive Round Table diagram showing members, pot, and voting dish tokens"
            >
              {/* Outer table rim */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="var(--bg-elevated)"
                stroke="var(--border-default)"
                strokeWidth="4"
              />

              {/* Inner table felt */}
              <circle
                cx={centerX}
                cy={centerY}
                r={radius - 24}
                fill="var(--bg-overlay)"
                stroke="var(--border-subtle)"
                strokeWidth="1.5"
              />

              {/* Center Pot Stack */}
              <circle
                cx={centerX}
                cy={centerY}
                r="46"
                fill="var(--bg-surface)"
                stroke="var(--accent)"
                strokeWidth="2.5"
              />
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-sans)"
                fontWeight="bold"
                fill="var(--text-muted)"
                letterSpacing="0.05em"
              >
                SHARED POT
              </text>
              <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                fontSize="13"
                fontFamily="var(--font-m-plus-1-code)"
                fontWeight="bold"
                fill="var(--accent)"
              >
                {poolEth}
              </text>
              <text
                x={centerX}
                y={centerY + 24}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-sans)"
                fill="var(--text-muted)"
              >
                BOT
              </text>

              {/* Member Seats on the rim */}
              {members.map((seat, index) => {
                const angle = (index / totalSeats) * 2 * Math.PI - Math.PI / 2;
                const seatX = centerX + radius * Math.cos(angle);
                const seatY = centerY + radius * Math.sin(angle);

                const isDimmed = !seat.canVote && claim?.open;
                const seatColor = seat.isClaimant
                  ? "var(--warning)"
                  : seat.isCreator
                  ? "var(--accent)"
                  : "var(--border-strong)";

                const short = seat.address.slice(2, 4).toUpperCase();

                return (
                  <g
                    key={seat.address}
                    transform={`translate(${seatX}, ${seatY})`}
                    className="cursor-pointer transition-transform hover:scale-110"
                    opacity={isDimmed ? 0.45 : 1}
                  >
                    <title>
                      {seat.address}
                      {seat.isCreator ? " (Creator)" : ""}
                      {seat.isClaimant ? " (Claimant)" : ""}
                      {seat.canVote ? " - Eligible voter" : ` - ${seat.ineligibleReason || "Ineligible"}`}
                    </title>
                    {/* Seat Circle */}
                    <circle
                      cx="0"
                      cy="0"
                      r="14"
                      fill="var(--bg-surface)"
                      stroke={seatColor}
                      strokeWidth={seat.isClaimant ? "3" : "2"}
                    />
                    {/* Seat Initials */}
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="var(--font-m-plus-1-code)"
                      fill="var(--text-primary)"
                    >
                      {short}
                    </text>

                    {/* Vote Token Badge if voted */}
                    {seat.hasVoted && (
                      <circle
                        cx="9"
                        cy="-9"
                        r="5"
                        fill={seat.voteChoice ? "var(--success)" : "var(--danger)"}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Season Bar (Spec §3.1) */}
          <div className="w-full mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-sans">
              <span className="text-[var(--text-muted)] font-medium">
                Season Duration
              </span>
              <span className="font-mono text-[var(--accent)] font-bold">
                {timeRemaining || "Active"}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-subtle)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${Math.min(Math.max(seasonProgressPercent, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
