# PolyLance: Enterprise Decentralized Freelance Marketplace

PolyLance is a high-performance, professional freelance ecosystem built on the Polygon network. It enables secured escrow payments, milestone-based job tracking, on-chain reputation systems, and NFT-based proof-of-work, ensuring a trustless and efficient marketplace for freelancers and clients alike.

## Features
- **Secure escrow payments with milestones**: Funds are locked in smart contracts and released only when work is approved.
- **On-chain reputation system**: Verified reviews and ratings stored directly on the blockchain.
- **NFT-based proof-of-work**: A unique NFT is minted for every completed job, serving as a permanent record of achievement.
- **Real-time messaging via XMTP**: Secure wallet-to-wallet chat powered by XMTP.
- **Multi-token support (MATIC, USDC, DAI)**: Pay in MATIC, USDC, or DAI.
- **Dispute resolution**: Integrated arbitration system for fair conflict resolution.
- **Advanced job filtering**: Filter jobs by category, budget, and search queries.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Wagmi + RainbowKit
- **Backend**: Node.js + Express + MongoDB
- **Smart Contracts**: Solidity + Hardhat + OpenZeppelin
- **Messaging**: XMTP
- **Indexing**: Custom event syncer

## Screenshots / Demo
| Dashboard | Job Market |
|-----------|------------|
| ![Dashboard](assets/dashboard.png) | ![Job Market](assets/job-market.png) |

[Add live demo link if deployed]

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB
- Polygon Amoy testnet RPC
- WalletConnect Project ID

### Setup
1. **Clone and install**
```bash
git clone https://github.com/akhilmuvva/polygon-freelance-marketplace.git
cd polygon-freelance-marketplace
# Install units
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd contracts && npm install && cd ..
```

2. **Run Development Servers**
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`

## 🛡️ Security
PolyLance has undergone initial security auditing. See [AUDIT.md](contracts/AUDIT.md) for detailed findings and remediation steps.

## 📜 Contract Architecture
```mermaid
sequenceDiagram
    actor Client
    actor Freelancer
    participant Contract as FreelanceEscrow
    
    Client->>Contract: createJob(token, amount)
    Note right of Client: Funds Locked
    
    Freelancer->>Contract: acceptJob(jobId)
    Note right of Freelancer: 10% Stake Locked
    
    Freelancer->>Contract: submitWork(ipfsURI)
    
    Client->>Contract: releaseFunds(jobId)
    Contract->>Freelancer: Transfer Payment + Stake
    Contract->>Freelancer: Mint NFT (Proof-of-Work)
```

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
