// lib/errors.ts - User-facing error decoders for Cover (Spec §4)
import { formatEther } from "viem";

export function formatCoverError(err: unknown): string {
  if (!err) return "An unknown error occurred.";
  const message = (err as Error).message || String(err);

  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction was cancelled in wallet.";
  }

  if (message.includes("ConnectorChainMismatchError")) {
    return "Your wallet is connected to the wrong network. Please switch to the correct network.";
  }

  if (message.includes("TooEarly")) {
    const match = message.match(/readyAt:\s*(\d+)/i) || message.match(/(\d{9,12})/);
    if (match) {
      const date = new Date(Number(match[1]) * 1000).toLocaleString();
      return `You can file from ${date}.`;
    }
    return "You must wait until your waiting period passes before filing.";
  }

  if (message.includes("ClaimOpen")) {
    return "A claim is already open.";
  }

  if (message.includes("BadAmount")) {
    const match = message.match(/max:\s*(\d+)/i) || message.match(/(\d{15,30})/);
    if (match) {
      return `A claim can be at most ${formatEther(BigInt(match[1]))} BOT right now.`;
    }
    return "Claim amount exceeds the maximum allowable share of the pot.";
  }

  if (message.includes("NotEligible")) {
    return "You joined after this claim opened.";
  }

  if (message.includes("TooFewVoters")) {
    const match = message.match(/eligible:\s*(\d+)/i) || message.match(/(\d+)/);
    const count = match ? match[1] : "1";
    return `Only ${count} members could vote; at least 2 are needed.`;
  }

  if (message.includes("ClaimantCannotVote")) {
    return "Claimants cannot vote on their own claims.";
  }

  if (message.includes("AlreadyVoted")) {
    return "You have already cast your vote on this claim.";
  }

  if (message.includes("VotingClosed")) {
    return "Voting for this claim has closed.";
  }

  if (message.includes("NotSettleable")) {
    return "This claim cannot be settled yet.";
  }

  if (message.includes("StillRunning")) {
    return "The pool season is still in progress and cannot be closed out.";
  }

  if (message.includes("PoolClosed")) {
    return "This pool is closed.";
  }

  if (message.includes("PoolFull")) {
    return "This pool has reached its maximum capacity of 50 members.";
  }

  if (message.includes("AlreadyMember")) {
    return "You are already a member of this pool.";
  }

  if (message.includes("NotMember")) {
    return "You must be a member of this pool to file a claim.";
  }

  if (message.includes("WrongPayment")) {
    return "Incorrect payment amount for the pool join fee.";
  }

  if (message.includes("BadParams")) {
    return "Invalid parameters provided.";
  }

  if (message.includes("BadReason")) {
    return "Reason must be between 1 and 300 bytes.";
  }

  return message.slice(0, 160);
}
