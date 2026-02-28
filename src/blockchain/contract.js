import * as StellarSdk from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

export const CONTRACT_ID =
  "CABXIUP6FTYYHZKD7ZCASSMFKKUSXYNCPVKRBNCIXPUEPQ5C3ZWGZYTV";

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const RPC_URL = "https://soroban-testnet.stellar.org";

const rpc = new Server(RPC_URL);

// read account for simulation
const READ_ACCOUNT =
  "GDLLRKGBCPUYRJE3HFYUNI46PQQNA5HPP6QR43FDPZJXNVHEW5QJ5LKV";

// ================= GET VOTES =================
export async function getVotes(option) {
  try {
    const contract = new StellarSdk.Contract(CONTRACT_ID);
    const account = await rpc.getAccount(READ_ACCOUNT);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "get_votes",
          StellarSdk.nativeToScVal(option, { type: "u32" })
        )
      )
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);
    if (sim.error) return 0;

    return Number(StellarSdk.scValToNative(sim.result.retval));
  } catch {
    return 0;
  }
}

// ================= GET BALANCE =================
export async function getBalance(publicKey) {
  try {
    const res = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${publicKey}`
    );
    const data = await res.json();
    const xlm = data.balances?.find((b) => b.asset_type === "native");
    return xlm ? parseFloat(xlm.balance).toFixed(2) : "0.00";
  } catch {
    return "0.00";
  }
}

// ================= SUBMIT VOTE =================
// ================= SUBMIT VOTE =================
export async function submitVote(option, publicKey, signTransaction) {
  if (!publicKey || !signTransaction)
    throw new Error("Wallet not connected");

  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await rpc.getAccount(publicKey);

  const voter = StellarSdk.Address.fromString(publicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000", // ← raise fee to 1 XLM max (Soroban needs this)
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "vote",
        voter.toScVal(),
        StellarSdk.nativeToScVal(option, { type: "u32" })
      )
    )
    .setTimeout(30)
    .build();

  // simulate
  const sim = await rpc.simulateTransaction(tx);
  if (sim.error) {
    console.error("SIM ERROR:", sim);
    throw new Error("Simulation failed: " + JSON.stringify(sim.error));
  }

  // ✅ CRITICAL: prepare the transaction with sim results (sets auth + fee)
  const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();

  // Freighter sign — pass XDR string
  const signedXdr = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Handle both string and object responses from Freighter
  const xdrString = typeof signedXdr === "string" 
    ? signedXdr 
    : signedXdr.signedTxXdr ?? signedXdr;

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    xdrString,
    NETWORK_PASSPHRASE
  );

  // send
  const send = await rpc.sendTransaction(signedTx);
  console.log("SEND RESULT:", send);

  if (send.status === "ERROR") {
    console.error("SEND ERROR:", send);
    // Decode errorResult for better debugging
    throw new Error("Transaction failed. Status: " + send.status);
  }

  return {
    hash: send.hash,
    status: send.status,
  };
}


// ================= WAIT =================
export async function waitForTransaction(hash) {
  for (let i = 0; i < 20; i++) {
    const tx = await rpc.getTransaction(hash);
    if (tx.status !== "NOT_FOUND") return tx;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timeout");
}