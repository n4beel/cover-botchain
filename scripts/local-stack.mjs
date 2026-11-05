import { spawn } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { COVER_ABI } from "../lib/botchain/abi.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 8766;
const RPC_URL = `http://127.0.0.1:${PORT}`;

// Anvil dev keys
const CREATOR_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ACTORS = [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
];

async function main() {
  console.log(`Starting local Anvil node on port ${PORT}...`);
  const anvil = spawn("anvil", ["--port", String(PORT)]);

  process.on("exit", () => anvil.kill());
  process.on("SIGINT", () => {
    anvil.kill();
    process.exit();
  });

  await new Promise((r) => setTimeout(r, 2000));

  const creatorAccount = privateKeyToAccount(CREATOR_KEY);
  const publicClient = createPublicClient({ transport: http(RPC_URL) });
  const creatorWallet = createWalletClient({
    account: creatorAccount,
    transport: http(RPC_URL),
  });

  const artifactPath = join(
    process.cwd(),
    "contracts/out/Cover.sol/Cover.json"
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode.object;

  console.log("Deploying Cover contract...");
  const deployHash = await creatorWallet.deployContract({
    abi: COVER_ABI,
    bytecode,
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });
  const contractAddress = receipt.contractAddress;
  console.log(`Deployed Cover to: ${contractAddress}`);

  // Update deployment JSON for local anvil chain
  const deploymentData = {
    address: contractAddress,
    deployedAt: Date.now(),
  };
  try {
    writeFileSync(
      join(process.cwd(), "deployments/localhost.json"),
      JSON.stringify(deploymentData, null, 2)
    );
  } catch {}

  const wallets = ACTORS.map((k) =>
    createWalletClient({
      account: privateKeyToAccount(k as `0x${string}`),
      transport: http(RPC_URL),
    })
  );

  const fee = parseEther("1");
  const waitSecs = 1800; // 30 min
  const voteSecs = 86400; // 1 day
  const maxClaimBps = 4000; // 40%
  const termSecs = 14 * 86400; // 14 days

  console.log("Seeding scenarios per Spec §5...");

  // Seed 1: Pot 1 with five members and an open claim (2 yes, 1 no, 2 not voted)
  const tx1 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "create",
    args: ["Community Emergency Pot", fee, waitSecs, voteSecs, maxClaimBps, BigInt(termSecs)],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });

  for (const w of wallets) {
    const jTx = await w.writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "join",
      args: [1n],
      value: fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: jTx });
  }

  // Advance time past waitSecs
  await (publicClient.request as any)({
    method: "evm_increaseTime",
    params: [waitSecs + 10],
  });
  await (publicClient.request as any)({ method: "evm_mine", params: [] });

  // Wallet 0 files claim
  const fTx1 = await wallets[0].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "file",
    args: [1n, parseEther("1.5"), "Storm damage roof repair"],
  });
  await publicClient.waitForTransactionReceipt({ hash: fTx1 });

  // 2 yes (creator, wallet 1), 1 no (wallet 2), 1 not voted (wallet 3)
  const v1 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [1n, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: v1 });

  const v2 = await wallets[1].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [1n, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: v2 });

  const v3 = await wallets[2].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [1n, false],
  });
  await publicClient.waitForTransactionReceipt({ hash: v3 });

  // Seed 2: Pot 2 with a claim that passed (claimant has pending)
  const tx2 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "create",
    args: ["Cyclists Aid Pot", fee, waitSecs, voteSecs, maxClaimBps, BigInt(termSecs)],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  for (let i = 0; i < 2; i++) {
    const jTx = await wallets[i].writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "join",
      args: [2n],
      value: fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: jTx });
  }

  const fTx2 = await wallets[0].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "file",
    args: [2n, parseEther("1"), "Replacement wheel and fork"],
  });
  await publicClient.waitForTransactionReceipt({ hash: fTx2 });

  const v4 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [2n, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: v4 });
  const v5 = await wallets[1].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [2n, true],
  });
  await publicClient.waitForTransactionReceipt({ hash: v5 });

  const sTx1 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "settle",
    args: [2n],
  });
  await publicClient.waitForTransactionReceipt({ hash: sTx1 });

  // Seed 3: Pot 3 with a rejected claim
  const tx3 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "create",
    args: ["Hackerspace Reserve", fee, waitSecs, voteSecs, maxClaimBps, BigInt(termSecs)],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx3 });
  for (let i = 0; i < 2; i++) {
    const jTx = await wallets[i].writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "join",
      args: [3n],
      value: fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: jTx });
  }

  const fTx3 = await wallets[0].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "file",
    args: [3n, parseEther("1"), "New coffee machine"],
  });
  await publicClient.waitForTransactionReceipt({ hash: fTx3 });

  const v6 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [3n, false],
  });
  await publicClient.waitForTransactionReceipt({ hash: v6 });
  const v7 = await wallets[1].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "vote",
    args: [3n, false],
  });
  await publicClient.waitForTransactionReceipt({ hash: v7 });

  const sTx2 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "settle",
    args: [3n],
  });
  await publicClient.waitForTransactionReceipt({ hash: sTx2 });

  // Seed 4: Pot 4 whose season has ended (close out available)
  const tx4 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "create",
    args: ["Short Season Pot", fee, waitSecs, voteSecs, maxClaimBps, 7n * 86400n],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx4 });
  for (let i = 0; i < 2; i++) {
    const jTx = await wallets[i].writeContract({
      address: contractAddress,
      abi: COVER_ABI,
      functionName: "join",
      args: [4n],
      value: fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: jTx });
  }

  // Seed 5: Pot 5 new with two members
  const tx5 = await creatorWallet.writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "create",
    args: ["Fresh Pot", fee, waitSecs, voteSecs, maxClaimBps, BigInt(termSecs)],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx5 });
  const jTx5 = await wallets[0].writeContract({
    address: contractAddress,
    abi: COVER_ABI,
    functionName: "join",
    args: [5n],
    value: fee,
  });
  await publicClient.waitForTransactionReceipt({ hash: jTx5 });

  console.log("Seeding complete! Local stack running on port", PORT);
}

main().catch(console.error);
