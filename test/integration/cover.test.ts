import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { COVER_ABI } from "../../lib/botchain/abi";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ANVIL_PORT = 8666;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

const localChain = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
});

// Anvil standard default keys
const CREATOR_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const MEMBER_A_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const MEMBER_B_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const MEMBER_C_KEY = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";

describe("Cover Integration Lifecycle (Anvil)", () => {
  let anvilProcess: ChildProcess;
  let contractAddress: `0x${string}`;

  const creatorAccount = privateKeyToAccount(CREATOR_KEY);
  const memberAAccount = privateKeyToAccount(MEMBER_A_KEY);
  const memberBAccount = privateKeyToAccount(MEMBER_B_KEY);
  const memberCAccount = privateKeyToAccount(MEMBER_C_KEY);

  const publicClient = createPublicClient({
    chain: localChain,
    transport: http(RPC_URL),
  });

  const creatorWallet = createWalletClient({
    account: creatorAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const memberAWallet = createWalletClient({
    account: memberAAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const memberBWallet = createWalletClient({
    account: memberBAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  const memberCWallet = createWalletClient({
    account: memberCAccount,
    chain: localChain,
    transport: http(RPC_URL),
  });

  beforeAll(async () => {
    // Start local anvil on port 8666
    anvilProcess = spawn("anvil", ["--port", String(ANVIL_PORT), "--silent"]);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Deploy contract
    const bytecodePath = join(
      __dirname,
      "../../contracts/out/Cover.sol/Cover.json"
    );
    const artifact = JSON.parse(readFileSync(bytecodePath, "utf8"));
    const bytecode = artifact.bytecode.object as `0x${string}`;

    const deployTxHash = await creatorWallet.deployContract({
      abi: COVER_ABI,
      bytecode,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployTxHash,
    });
    contractAddress = receipt.contractAddress!;
    expect(contractAddress).toBeDefined();
  });

  afterAll(() => {
    if (anvilProcess) {
      anvilProcess.kill();
    }
  });

  it("executes the full long path: create -> join -> wait -> file -> vote -> settle -> withdraw -> closeOut", async () => {
    const joinFee = parseEther("1");
    const waitSecs = 3600; // 1 hr
    const voteSecs = 86400; // 1 day
    const maxClaimBps = 5000; // 50%
    const termSecs = 7 * 86400; // 7 days

    // 1. Creator creates pool (member 1)
    const createTx = await creatorWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "create",
      args: ["Mutual Aid Pot", joinFee, waitSecs, voteSecs, maxClaimBps, BigInt(termSecs)],
      value: joinFee,
    });
    await publicClient.waitForTransactionReceipt({ hash: createTx });

    const poolId = 1n;
    let pool = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "poolOf",
      args: [poolId],
    });
    expect(pool.memberCount).toBe(1);
    expect(pool.pool).toBe(joinFee);

    // 2. Member A, B, C join
    for (const client of [memberAWallet, memberBWallet, memberCWallet]) {
      const joinTx = await client.writeContract({
        address: contractAddress,
        abi: COVER_ABI,
        functionName: "join",
        args: [poolId],
        value: joinFee,
      });
      await publicClient.waitForTransactionReceipt({ hash: joinTx });
    }

    pool = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "poolOf",
      args: [poolId],
    });
    expect(pool.memberCount).toBe(4);
    expect(pool.pool).toBe(parseEther("4"));

    // 3. Jump time past waitSecs
    await (publicClient.request as any)({
      method: "evm_increaseTime",
      params: [waitSecs + 10],
    });
    await (publicClient.request as any)({
      method: "evm_mine",
      params: [],
    });

    // 4. Member A files a claim for 1.5 BOT (<= 50% of 4 BOT = 2 BOT)
    const claimAmt = parseEther("1.5");
    const fileTx = await memberAWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "file",
      args: [poolId, claimAmt, "Emergency surgery needed"],
    });
    await publicClient.waitForTransactionReceipt({ hash: fileTx });

    let claim = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "claimOf",
      args: [poolId, 1],
    });
    expect(claim.open).toBe(true);
    expect(claim.amount).toBe(claimAmt);
    expect(claim.eligible).toBe(3); // Creator, B, C

    // 5. Creator and Member B vote yes (2 yes votes > 3 / 2 = 1.5 => strict majority)
    const voteTx1 = await creatorWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "vote",
      args: [poolId, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: voteTx1 });

    const voteTx2 = await memberBWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "vote",
      args: [poolId, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: voteTx2 });

    // 6. Early settle passes
    const settleTx = await memberAWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "settle",
      args: [poolId],
    });
    await publicClient.waitForTransactionReceipt({ hash: settleTx });

    claim = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "claimOf",
      args: [poolId, 1],
    });
    expect(claim.open).toBe(false);

    const pendingA = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "pending",
      args: [memberAAccount.address],
    });
    expect(pendingA).toBe(claimAmt);

    // 7. Member A withdraws claim
    const withdrawTx = await memberAWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "withdraw",
    });
    await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

    const pendingAAfter = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "pending",
      args: [memberAAccount.address],
    });
    expect(pendingAAfter).toBe(0n);

    // Pool remaining: 4 - 1.5 = 2.5 BOT
    pool = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "poolOf",
      args: [poolId],
    });
    expect(pool.pool).toBe(parseEther("2.5"));

    // 8. Jump to season end & close out
    await (publicClient.request as any)({
      method: "evm_increaseTime",
      params: [termSecs + 100],
    });
    await (publicClient.request as any)({
      method: "evm_mine",
      params: [],
    });

    const closeOutTx = await creatorWallet.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "closeOut",
      args: [poolId],
    });
    await publicClient.waitForTransactionReceipt({ hash: closeOutTx });

    pool = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "poolOf",
      args: [poolId],
    });
    expect(pool.closed).toBe(true);
    expect(pool.pool).toBe(0n);

    // Remaining 2.5 BOT split across 4 members: 2.5e18 / 4 = 625000000000000000 each
    const expectedShare = parseEther("0.625");
    const pendingB = await publicClient.readContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "pending",
      args: [memberBAccount.address],
    });
    expect(pendingB).toBe(expectedShare);
  });
});
