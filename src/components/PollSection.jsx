import { useState, useEffect, useCallback } from "react";
import { getVotes, submitVote, waitForTransaction, CONTRACT_ID } from "../blockchain/contract";

const OPTIONS = [
  { id: 0, name: "Star Stellar",   emoji: "⭐" },
  { id: 1, name: "ETH Ethereum",   emoji: "Ξ"  },
  { id: 2, name: "BTC Bitcoin",    emoji: "₿"  },
  { id: 3, name: "ADA Cardano",    emoji: "₳"  },
];

export default function PollSection({ connectedWallet, setError, setSuccess, setLastTx }) {
  const [votes, setVotes]               = useState([0, 0, 0, 0]);
  const [txStatus, setTxStatus]         = useState(null); // null | "pending" | "success" | "fail"
  const [loadingOption, setLoadingOption] = useState(null);
  const [voted, setVoted]               = useState(false);

  // ── Fetch vote counts ──────────────────────────────────
  const fetchVotes = useCallback(async () => {
    const results = await Promise.all(
      OPTIONS.map(async (opt) => {
        try { return await getVotes(opt.id); } catch { return 0; }
      })
    );
    setVotes(results);
  }, []);

  useEffect(() => {
    fetchVotes();
    const interval = setInterval(fetchVotes, 10000);
    return () => clearInterval(interval);
  }, [fetchVotes]);

  // ── Handle vote click ──────────────────────────────────
  const handleVote = async (option) => {
    if (!connectedWallet) {
      setError("❌ Please connect your wallet first");
      return;
    }
    if (voted) {
      setError("✅ You have already voted!");
      return;
    }

    setError("");
    setSuccess("🔐 Opening Freighter — please approve the transaction...");
    setLoadingOption(option.id);
    setTxStatus("pending");

    try {
      // submitVote internally calls connectedWallet.signTransaction
      // which triggers the Freighter popup
      const response = await submitVote(
        option.id,
        connectedWallet.address,
        connectedWallet.signTransaction
      );

      console.log("Vote submitted:", response);
      setLastTx(response.hash);
      setSuccess("⏳ Waiting for blockchain confirmation...");

      const result = await waitForTransaction(response.hash);
      console.log("TX result:", result);

      if (result?.status === "SUCCESS") {
        setTxStatus("success");
        setVoted(true);
        setSuccess(`✅ Vote confirmed! TX: ${response.hash.slice(0, 16)}...`);
        setTimeout(fetchVotes, 2000);
      } else {
        setTxStatus("fail");
        setError("❌ Transaction failed on chain. Status: " + result?.status);
      }
    } catch (err) {
      setTxStatus("fail");
      setSuccess("");
      console.error("Vote error:", err);

      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("rejected") || msg.includes("cancel") || msg.includes("declined")) {
        setError("🚫 Transaction rejected in Freighter.");
      } else if (msg.includes("empty xdr") || msg.includes("testnet")) {
        setError("⚠️ Switch Freighter to TESTNET network and reconnect.");
      } else if (msg.includes("insufficient")) {
        setError("💸 Insufficient XLM balance.");
      } else if (msg.includes("timeout")) {
        setError("⏱️ Transaction timed out. Try again.");
      } else {
        setError("❌ " + (err?.message || "Unknown error"));
      }
    } finally {
      setLoadingOption(null);
    }
  };

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  return (
    <div className="poll-card">
      <div className="poll-title">Which blockchain is best for payments?</div>

      <div className="poll-subtitle">
        Live on-chain · {totalVotes} total votes
        {txStatus === "pending" && <span className="tx-badge pending"> ⏳ Pending</span>}
        {txStatus === "success" && <span className="tx-badge success"> ✅ Confirmed</span>}
        {txStatus === "fail"    && <span className="tx-badge fail">    ❌ Failed</span>}
      </div>

      {OPTIONS.map((opt) => {
        const count     = votes[opt.id] || 0;
        const pct       = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isLoading = loadingOption === opt.id;

        return (
          <div key={opt.id} className="poll-option">
            <div className="vote-row">
              <span className="option-name">{opt.emoji} {opt.name}</span>
              <span className="option-pct">{pct}%</span>
            </div>

            <div className="progress">
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>

            <div className="vote-meta">
              <span className="vote-count">{count} votes</span>
              <button
                className="vote-btn"
                onClick={() => handleVote(opt)}
                disabled={isLoading || loadingOption !== null || voted}
              >
                {isLoading ? "🔐 Signing..." : voted ? "✅ Voted" : "Vote"}
              </button>
            </div>
          </div>
        );
      })}

      <div className="contract-ref">
        Contract: {CONTRACT_ID.slice(0, 8)}...{CONTRACT_ID.slice(-8)}
      </div>
    </div>
  );
}