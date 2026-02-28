import { useState } from "react";
import WalletSection from "./components/WalletSection";
import PollSection from "./components/PollSection";
import { CONTRACT_ID } from "./blockchain/contract";
import "./App.css";

function Navbar({ connectedWallet }) {
  return (
    <nav className="navbar">
      <a className="nav-brand" href="#">
        <div className="nav-logo">⭐</div>
        <span className="nav-brand-name">StellarPoll</span>
      </a>

      <div className="nav-links">
        <a className="nav-link active" href="#">Vote</a>
        <a className="nav-link" href="https://stellar.org/learn/intro-to-stellar" target="_blank" rel="noreferrer">
          About Stellar
        </a>
        <a className="nav-link" href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">
          Contract <span className="nav-badge">TESTNET</span>
        </a>
      </div>

      <div className="nav-right">
        <div className="nav-status-dot" title="Testnet Online" />
        <div className="nav-network-pill">
          🌐 Testnet
        </div>
      </div>
    </nav>
  );
}

function ProjectInfo({ CONTRACT_ID }) {
  return (
    <div className="project-info">
      <div className="project-info-title">📖 About This DApp</div>

      <div className="info-cards">
        <div className="info-card">
          <div className="info-card-icon">⛓️</div>
          <div className="info-card-label">Blockchain</div>
          <div className="info-card-value">Stellar</div>
          <div className="info-card-sub">Soroban Smart Contract</div>
        </div>
        <div className="info-card">
          <div className="info-card-icon">🌐</div>
          <div className="info-card-label">Network</div>
          <div className="info-card-value">Testnet</div>
          <div className="info-card-sub">soroban-testnet.stellar.org</div>
        </div>
        <div className="info-card">
          <div className="info-card-icon">🔐</div>
          <div className="info-card-label">Auth</div>
          <div className="info-card-value">Freighter</div>
          <div className="info-card-sub">Browser wallet</div>
        </div>
        <div className="info-card">
          <div className="info-card-icon">📝</div>
          <div className="info-card-label">Language</div>
          <div className="info-card-value">Rust / React</div>
          <div className="info-card-sub">stellar-sdk JS</div>
        </div>
      </div>

      <div className="how-it-works">
        <div className="how-title">How It Works</div>
        <div className="how-steps">
          <div className="how-step">
            <div className="step-num">1</div>
            <div className="step-text"><strong>Connect your wallet</strong> — Install the Freighter browser extension and switch it to Testnet.</div>
          </div>
          <div className="how-step">
            <div className="step-num">2</div>
            <div className="step-text"><strong>Cast your vote</strong> — Click Vote on any option. Freighter will ask you to sign the transaction.</div>
          </div>
          <div className="how-step">
            <div className="step-num">3</div>
            <div className="step-text"><strong>On-chain confirmation</strong> — Your vote is submitted to the Soroban smart contract on Stellar Testnet and results update live.</div>
          </div>
          <div className="how-step">
            <div className="step-num">4</div>
            <div className="step-text"><strong>Verify anytime</strong> — Click the contract link in the navbar to inspect the contract on Stellar Expert explorer.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastTx, setLastTx] = useState(null);

  return (
    <>
      <Navbar connectedWallet={connectedWallet} />

      <div className="app-root">
        <header className="app-header">
          <h1>Stellar Live Poll</h1>
          <p>On-chain voting powered by Soroban Smart Contracts</p>
          <div className="header-tags">
            <span className="htag blue">⭐ Stellar Network</span>
            <span className="htag cyan">🔗 Soroban</span>
            <span className="htag green">✅ Testnet Live</span>
          </div>
        </header>

        {error && (
          <div className="alert error" onClick={() => setError("")}>{error}</div>
        )}
        {success && (
          <div className="alert success" onClick={() => setSuccess("")}>{success}</div>
        )}

        <WalletSection
          connectedWallet={connectedWallet}
          setConnectedWallet={setConnectedWallet}
          setBalance={setBalance}
          setError={setError}
          setSuccess={setSuccess}
        />

        <PollSection
          connectedWallet={connectedWallet}
          setError={setError}
          setSuccess={setSuccess}
          setLastTx={setLastTx}
        />

        <div className="info-panel">
          <h3>🔌 Connection Details</h3>
          <div className="info-row">
            <span>Wallet</span>
            <span className="mono">
              {connectedWallet
                ? `${connectedWallet.walletIcon} ${connectedWallet.walletName} · ${connectedWallet.address.slice(0,6)}...${connectedWallet.address.slice(-6)}`
                : "Not connected"}
            </span>
          </div>
          <div className="info-row">
            <span>Balance</span>
            <span>{balance ? balance + " XLM" : "—"}</span>
          </div>
          <div className="info-row">
            <span>Network</span>
            <span>Stellar Testnet</span>
          </div>
          <div className="info-row">
            <span>Contract</span>
            <span className="mono">{CONTRACT_ID.slice(0,8)}...{CONTRACT_ID.slice(-8)}</span>
          </div>
          {lastTx && (
            <div className="tx-box">
              <div>Last Vote TX</div>
              <a href={`https://stellar.expert/explorer/testnet/tx/${lastTx}`} target="_blank" rel="noreferrer">
                {lastTx.slice(0,10)}...{lastTx.slice(-10)}
              </a>
            </div>
          )}
        </div>

        <ProjectInfo CONTRACT_ID={CONTRACT_ID} />
      </div>
    </>
  );
}