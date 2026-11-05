// lib/limits.ts - Constants mirrored from contracts/src/Cover.sol
import { parseEther } from "viem";

export const MAX_MEMBERS = 50;
export const MAX_NAME_BYTES = 48;
export const MIN_FEE = parseEther("0.01");
export const MAX_FEE = parseEther("1000");
export const MIN_WAIT = 3600; // 1 hours
export const MAX_WAIT = 7776000; // 90 days
export const MIN_VOTE = 3600; // 1 hours
export const MAX_VOTE = 1209600; // 14 days
export const MIN_TERM = 604800; // 7 days
export const MAX_TERM = 31536000; // 365 days
export const MIN_CLAIM_BPS = 100;
export const MAX_CLAIM_BPS = 5000;
export const MIN_ELIGIBLE = 2;
export const MAX_REASON_BYTES = 300;
