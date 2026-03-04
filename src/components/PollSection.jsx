import { useState, useEffect, useCallback, useRef } from "react";
import { getVotes, submitVote, waitForTransaction, CONTRACT_ID, giveReward } from "../blockchain/contract";

const OPTIONS = [
  { id: 0, name: "Stellar",  short: "STR", color: "#6366f1" },
  { id: 1, name: "Ethereum", short: "ETH", color: "#06b6d4" },
  { id: 2, name: "Bitcoin",  short: "BTC", color: "#f59e0b" },
  { id: 3, name: "Cardano",  short: "ADA", color: "#10b981" },
];

function useAnimatedCount(target) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const steps = 20;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplay(Math.round(start + (diff * step) / steps));
      if (step >= steps) { clearInterval(timer); prev.current = target; }
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return display;
}

function Confetti() {
  const pieces = Array.from({ length: 32 }, (_, i) => i);
  const colors = ["#6366f1", "#06b6d4", "#f59e0b", "#10b981", "#f472b6", "#a78bfa"];
  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map((i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: Math.random() * 100 + "%",
            background: colors[i % colors.length],
            animationDelay: (Math.random() * 0.5) + "s",
            animationDuration: (1.2 + Math.random() * 1) + "s",
            width: (6 + Math.random() * 6) + "px",
            height: (6 + Math.random() * 6) + "px",
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

function DonutChart({ votes, total }) {
  const size = 120;
  const r = 45;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = OPTIONS.map((opt, i) => {
    const pct = total > 0 ? votes[i] / total : 0.25;
    const dash = pct * circ;
    const gap = circ - dash;
    const slice = { color: opt.color, dash, gap, offset };
    offset += dash;
    return slice;
  });
  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size} className="donut-chart">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="18" />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="18"
          strokeDasharray={s.dash + " " + s.gap}
          strokeDashoffset={-s.offset + circ * 0.25}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="9">VOTES</text>
    </svg>
  );
}

function NetworkBadge() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <span className={online ? "net-badge online" : "net-badge offline"}>
      <span className="net-dot" />
      {online ? "Testnet Live" : "Offline"}
    </span>
  );
}

function Spinner() {
  return <span className="spinner" />;
}

function SuccessBurst({ option, rewardEarned }) {
  return (
    <div className="burst-overlay">
      <Confetti />
      <div className="burst-icon">🎉</div>
      <div className="burst-text">Vote Confirmed!</div>
      <div className="burst-sub">
        {"Voted for " + (option || "") + " on Stellar Testnet"}
      </div>
      {rewardEarned && (
        <div className="burst-sub" style={{ color: "#f59e0b", marginTop: "6px", fontWeight: "700" }}>
          🏆 Reward Earned!
        </div>
      )}
    </div>
  );
}

export default function PollSection({ connectedWallet, setError, setSuccess, setLastTx }) {
  const [votes, setVotes]                 = useState([0, 0, 0, 0]);
  const [txStatus, setTxStatus]           = useState(null);
  const [loadingOption, setLoadingOption] = useState(null);
  const [voted, setVoted]                 = useState(false);
  const [votedOption, setVotedOption]     = useState(null);
  const [showBurst, setShowBurst]         = useState(false);
  const [rewardEarned, setRewardEarned]   = useState(false);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [txHistory, setTxHistory]         = useState([]);
  const [showShare, setShowShare]         = useState(false);
  const [countdown, setCountdown]         = useState(10);
  const [copiedHash, setCopiedHash]       = useState(null);

  const totalVotes = votes.reduce((a, b) => a + b, 0);
  const animatedTotal = useAnimatedCount(totalVotes);

  const fetchVotes = useCallback(async (silent) => {
    if (!silent) setIsRefreshing(true);
    const results = await Promise.all(
      OPTIONS.map(async (opt) => {
        try { return await getVotes(opt.id); } catch (e) { return 0; }
      })
    );
    setVotes(results);
    setLastRefresh(new Date());
    setCountdown(10);
    if (!silent) setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchVotes(false);
    const interval = setInterval(() => fetchVotes(true), 10000);
    return () => clearInterval(interval);
  }, [fetchVotes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 10 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVote = async (option) => {
    if (!connectedWallet) { setError("Please connect your wallet first"); return; }
    if (voted) { setError("You already voted this session!"); return; }
    setError("");
    setSuccess("Opening wallet, please approve...");
    setLoadingOption(option.id);
    setTxStatus("pending");
    try {
      const response = await submitVote(option.id, connectedWallet.address, connectedWallet.signTransaction);
      setLastTx(response.hash);
      setSuccess("Waiting for blockchain confirmation...");
      const result = await waitForTransaction(response.hash);
      if (result && result.status === "SUCCESS") {
        setTxStatus("success");
        setVoted(true);
        setVotedOption(option.id);
        setSuccess("Vote confirmed on Stellar! Claiming reward...");

        // ✅ INTER-CONTRACT CALL — PollReward contract
        try {
          await giveReward(connectedWallet.address, connectedWallet.signTransaction);
          setRewardEarned(true);
          setSuccess("Vote confirmed + Reward earned! 🏆");
        } catch (e) {
          setSuccess("Vote confirmed on Stellar!");
        }

        setShowBurst(true);
        setTimeout(() => setShowBurst(false), 3500);
        setTxHistory((prev) => [
          { hash: response.hash, option: option.name, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 4)
        ]);
        setTimeout(() => fetchVotes(false), 2000);
      } else {
        setTxStatus("fail");
        setError("Transaction failed on chain.");
      }
    } catch (err) {
      setTxStatus("fail");
      setSuccess("");
      const msg = err && err.message ? err.message.toLowerCase() : "";
      if (msg.includes("rejected") || msg.includes("cancel") || msg.includes("declined")) {
        setError("Transaction rejected in wallet.");
      } else if (msg.includes("insufficient")) {
        setError("Insufficient XLM balance.");
      } else if (msg.includes("testnet") || msg.includes("empty xdr")) {
        setError("Switch wallet to TESTNET and reconnect.");
      } else {
        setError(err && err.message ? err.message : "Unknown error");
      }
    } finally {
      setLoadingOption(null);
    }
  };

  const sorted = [...votes.map((v, i) => ({ id: i, votes: v }))].sort((a, b) => b.votes - a.votes);
  const leader = sorted[0].id;

  function getRank(id) { return sorted.findIndex((x) => x.id === id) + 1; }

  function getTxBadge() {
    if (txStatus === "pending") return <span className="tx-badge pending">Pending</span>;
    if (txStatus === "success") return <span className="tx-badge success">Confirmed</span>;
    if (txStatus === "fail") return <span className="tx-badge fail">Failed</span>;
    return null;
  }

  function handleShare() {
    const winner = OPTIONS[leader];
    const pct = totalVotes > 0 ? Math.round((votes[leader] / totalVotes) * 100) : 0;
    const text = "I voted on Live Poll (Stellar Blockchain)! " + winner.name + " is leading with " + pct + "% · " + window.location.href;
    if (navigator.share) {
      navigator.share({ title: "Live Poll", text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text);
      setShowShare(true);
      setTimeout(() => setShowShare(false), 2000);
    }
  }

  function copyHash(hash) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  }

  const refreshTime = lastRefresh ? lastRefresh.toLocaleTimeString() : "--";

  return (
    <div className="poll-card" style={{ position: "relative" }}>

      {showBurst && <SuccessBurst option={votedOption !== null ? OPTIONS[votedOption].name : ""} rewardEarned={rewardEarned} />}

      <div className="poll-header">
        <div>
          <div className="poll-title">Which blockchain is best for payments?</div>
          <NetworkBadge />
        </div>
        <div className="poll-header-right">
          <span className="countdown-badge">{"Next: " + countdown + "s"}</span>
          <button className="refresh-btn" onClick={() => fetchVotes(false)} disabled={isRefreshing}>
            {isRefreshing ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="poll-subtitle">
        {"Live on-chain · "}<strong>{animatedTotal}</strong>{" total votes "}
        {getTxBadge()}
      </div>

      <div className="chart-stats-row">
        <DonutChart votes={votes} total={totalVotes} />
        <div className="poll-stats-grid">
          <div className="poll-stat">
            <span className="stat-num">{animatedTotal}</span>
            <span className="stat-label">Total Votes</span>
          </div>
          <div className="poll-stat">
            <span className="stat-num">{OPTIONS[leader] ? OPTIONS[leader].name : "--"}</span>
            <span className="stat-label">Leading</span>
          </div>
          <div className="poll-stat">
            <span className="stat-num">{refreshTime}</span>
            <span className="stat-label">Updated</span>
          </div>
          <div className="poll-stat">
            <span className="stat-num">{txStatus ? txStatus : "--"}</span>
            <span className="stat-label">TX Status</span>
          </div>
        </div>
      </div>

      {OPTIONS.map((opt) => {
        const count = votes[opt.id] || 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isLoading = loadingOption === opt.id;
        const isLeader = opt.id === leader && totalVotes > 0;
        const rank = getRank(opt.id);
        const isMyVote = votedOption === opt.id;

        return (
          <div key={opt.id} className={isLeader ? "poll-option leader" : "poll-option"}>
            <div className="vote-row">
              <div className="option-left">
                <span className="rank-badge" style={{ background: rank === 1 ? "#f59e0b22" : "rgba(255,255,255,0.04)", color: rank === 1 ? "#f59e0b" : "#64748b" }}>
                  {"#" + rank}
                </span>
                <span className="option-short" style={{ background: opt.color + "22", color: opt.color }}>
                  {opt.short}
                </span>
                <span className="option-name">{opt.name}</span>
                {isLeader && totalVotes > 0 && <span className="leader-crown">👑</span>}
                {isMyVote && <span className="my-vote-badge">Your Vote ✅</span>}
                {isMyVote && rewardEarned && <span className="my-vote-badge" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }}>🏆 Rewarded</span>}
              </div>
              <span className="option-pct" style={{ color: opt.color }}>{pct + "%"}</span>
            </div>

            <div className="progress">
              <div className="progress-bar" style={{ width: pct + "%", background: opt.color }} />
            </div>

            <div className="vote-meta">
              <span className="vote-count">{count + " votes"}</span>
              <button
                className="vote-btn"
                onClick={() => handleVote(opt)}
                disabled={isLoading || loadingOption !== null || voted}
                style={voted ? {} : { background: opt.color }}
              >
                {isLoading ? <><Spinner /> Signing...</> : voted ? "Voted" : "Vote"}
              </button>
            </div>
          </div>
        );
      })}

      {voted && (
        <div className="share-row">
          <button className="share-btn" onClick={handleShare}>
            {showShare ? "Copied to clipboard!" : "Share Results"}
          </button>
        </div>
      )}

      {txHistory.length > 0 && (
        <div className="tx-history">
          <div className="tx-history-title">Recent Transactions</div>
          {txHistory.map((tx, i) => {
            const url = "https://stellar.expert/explorer/testnet/tx/" + tx.hash;
            return (
              <div key={i} className="tx-history-row">
                <span className="tx-history-opt">{"Voted " + tx.option}</span>
                <span className="tx-history-time">{tx.time}</span>
                <button className="copy-hash-btn" onClick={() => copyHash(tx.hash)}>
                  {copiedHash === tx.hash ? "Copied!" : "Copy TX"}
                </button>
                <a className="tx-history-link" href={url} target="_blank" rel="noreferrer">
                  View
                </a>
              </div>
            );
          })}
        </div>
      )}

      <div className="contract-ref">
        {"Poll: " + CONTRACT_ID.slice(0, 8) + "..." + CONTRACT_ID.slice(-8) + " | Reward: CDO6NXBA...TTJDS"}
      </div>

    </div>
  );
}