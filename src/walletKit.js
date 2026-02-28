import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction as freighterSign,
} from "@stellar/freighter-api";

export const WALLETS = [
  {
    id: "freighter", name: "Freighter", icon: "🚀",
    installUrl: "https://www.freighter.app/",
    detect: async () => {
      try {
        const res = await isConnected();
        return res === true || res?.isConnected === true;
      } catch { return false; }
    },
  },
  {
    id: "xbull", name: "xBull Wallet", icon: "🐂",
    installUrl: "https://xbull.app/",
    detect: async () => !!window.xBullSDK,
  },
  {
    id: "lobstr", name: "Lobstr", icon: "🦞",
    installUrl: "https://lobstr.co/",
    detect: async () => !!window.lobstr,
  },
  {
    id: "rabet", name: "Rabet", icon: "🐰",
    installUrl: "https://rabet.io/",
    detect: async () => !!window.rabet,
  },
];

export async function getInstalledWallets() {
  return Promise.all(WALLETS.map(async (w) => ({ ...w, installed: await w.detect() })));
}

export async function connectWallet(walletId) {
  switch (walletId) {
    case "freighter": return connectFreighter();
    case "xbull":     return connectXBull();
    case "lobstr":    return connectLobstr();
    case "rabet":     return connectRabet();
    default:          return { success: false, error: "UNKNOWN_WALLET" };
  }
}

async function connectFreighter() {
  try {
    const connRes = await isConnected();
    const ok = connRes === true || connRes?.isConnected === true;
    if (!ok) return { success: false, error: "WALLET_NOT_FOUND" };

    await requestAccess();

    const addrRes = await getAddress();
    const address = typeof addrRes === "string" ? addrRes : addrRes?.address;
    if (!address) return { success: false, error: "ACCESS_DENIED" };

    // ✅ This is the function PollSection will call to trigger Freighter popup
    const signTransaction = async (xdr, opts) => {
      console.log("🔐 Freighter signTransaction called — popup should appear...");

      // Freighter v6: positional args — freighterSign(xdr, options)
      const result = await freighterSign(xdr, {
        networkPassphrase: opts?.networkPassphrase || "Test SDF Network ; September 2015",
      });

      console.log("Freighter raw result:", JSON.stringify(result));

      // v6 returns { signedTxXdr: string, signerAddress: string }
      if (typeof result?.signedTxXdr === "string" && result.signedTxXdr.length > 50)
        return result.signedTxXdr;

      // Older versions return plain XDR string
      if (typeof result === "string" && result.length > 50)
        return result;

      if (typeof result?.xdr === "string" && result.xdr.length > 50)
        return result.xdr;

      // Empty XDR = TESTNET not selected in Freighter
      if (result?.signedTxXdr === "") {
        throw new Error("Freighter returned empty XDR. Please switch to TESTNET in Freighter extension.");
      }

      if (result?.error) {
        throw new Error("Freighter error: " + JSON.stringify(result.error));
      }

      throw new Error("Unexpected Freighter response: " + JSON.stringify(result));
    };

    return {
      success: true,
      walletId: "freighter",
      walletName: "Freighter",
      walletIcon: "🚀",
      address,
      signTransaction,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function connectXBull() {
  try {
    if (!window.xBullSDK) return { success: false, error: "WALLET_NOT_FOUND" };
    const address = await window.xBullSDK.getPublicKey();
    const signTransaction = async (xdr, opts) => {
      const res = await window.xBullSDK.signXDR(xdr, { networkPassphrase: opts?.networkPassphrase });
      return typeof res === "string" ? res : res?.xdr;
    };
    return { success: true, walletId: "xbull", walletName: "xBull", walletIcon: "🐂", address, signTransaction };
  } catch (err) { return { success: false, error: err.message }; }
}

async function connectLobstr() {
  try {
    if (!window.lobstr) return { success: false, error: "WALLET_NOT_FOUND" };
    const address = await window.lobstr.getPublicKey();
    const signTransaction = async (xdr) => {
      const res = await window.lobstr.signTransaction(xdr);
      return typeof res === "string" ? res : res?.xdr;
    };
    return { success: true, walletId: "lobstr", walletName: "Lobstr", walletIcon: "🦞", address, signTransaction };
  } catch (err) { return { success: false, error: err.message }; }
}

async function connectRabet() {
  try {
    if (!window.rabet) return { success: false, error: "WALLET_NOT_FOUND" };
    const address = await window.rabet.getPublicKey();
    const signTransaction = async (xdr, opts) => {
      const res = await window.rabet.sign(xdr, opts?.networkPassphrase);
      return typeof res === "string" ? res : res?.xdr;
    };
    return { success: true, walletId: "rabet", walletName: "Rabet", walletIcon: "🐰", address, signTransaction };
  } catch (err) { return { success: false, error: err.message }; }
}