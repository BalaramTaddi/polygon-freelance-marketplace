# Real-World Asset (RWA) Tokenization Module

## 🎯 Overview

The RWA Tokenization Module enables clients to tokenize real-world assets as on-chain primitives, unlocking liquidity and enabling automated value distribution through milestone-based escrows verified by AI oracles and Kleros arbitration.

## 📦 Components

### 1. **AssetTokenizer** (ERC-1155)
Fractional tokenization of real-world assets with milestone-based value release.

**Supported Asset Types:**
- 📄 **Invoices** - Accounts receivable financing
- 🎨 **IP Rights** - Intellectual property licensing
- 💰 **Revenue Shares** - Future earnings distribution
- 🏢 **Future Earnings** - Projected income streams
- 📦 **Physical Assets** - Tokenized goods/equipment

**Key Features:**
- Fractional ownership via ERC-1155
- Milestone-based progressive value release
- Oracle-verified completion (AI + Kleros)
- Automated proportional distribution to token holders
- Legal agreement hash anchoring

### 2. **InvoiceNFT** (ERC-721)
Dedicated invoice financing with discount-based factoring.

**Use Cases:**
- **Invoice Factoring** - Sell invoices at discount for immediate liquidity
- **Supply Chain Finance** - Tokenize B2B payment obligations
- **Freelancer Cash Flow** - Convert pending payments to instant cash

**Key Features:**
- Each invoice = unique NFT
- Dynamic discount rate calculation
- Late payment penalties
- Debtor payment tracking
- Transferable ownership (secondary market)

### 3. **AIOracle**
Automated verification using AI analysis with confidence-based approval.

**Verification Types:**
- Milestone completion proof
- Invoice authenticity
- Asset valuation
- IP rights validation
- Work quality assessment

**Key Features:**
- Confidence scoring (0-100%)
- Auto-approval threshold (default: 80%)
- Manual override for disputed cases
- IPFS proof document linking
- Multi-contract integration

---

## 🚀 Quick Start

### Deployment

```bash
# Deploy RWA suite
npx hardhat run scripts/deploy_rwa.js --network polygon_amoy

# Output:
# AIOracle:        0x...
# AssetTokenizer:  0x...
# InvoiceNFT:      0x...
```

### Basic Usage

#### **Tokenize a Revenue Share**

```javascript
const AssetTokenizer = await ethers.getContractAt("AssetTokenizer", ASSET_TOKENIZER_ADDRESS);

// Create revenue share token
const tx = await AssetTokenizer.tokenizeAsset(
    2, // AssetType.REVENUE_SHARE
    USDC_ADDRESS, // Payment token
    ethers.parseUnits("100000", 6), // $100k total value
    10000, // 10,000 fractional tokens
    Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year maturity
    "ipfs://Qm...", // Metadata URI
    ethers.keccak256(ethers.toUtf8Bytes("Legal Agreement Hash"))
);

const receipt = await tx.wait();
const tokenId = receipt.logs[0].args.tokenId;
console.log("Revenue Share Token ID:", tokenId);
```

#### **Create Milestones**

```javascript
// Milestone 1: Q1 Revenue Target
await AssetTokenizer.createMilestone(
    tokenId,
    "Q1 Revenue: $25k",
    ethers.parseUnits("25000", 6),
    Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60 // 90 days
);

// Milestone 2: Q2 Revenue Target
await AssetTokenizer.createMilestone(
    tokenId,
    "Q2 Revenue: $25k",
    ethers.parseUnits("25000", 6),
    Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60 // 180 days
);
```

#### **AI Verification Flow**

```javascript
const AIOracle = await ethers.getContractAt("AIOracle", AI_ORACLE_ADDRESS);

// 1. Request verification
const requestTx = await AIOracle.requestVerification(
    ASSET_TOKENIZER_ADDRESS,
    tokenId,
    "milestone",
    "ipfs://Qm...proof-documents"
);

const requestReceipt = await requestTx.wait();
const requestId = requestReceipt.logs[0].args.requestId;

// 2. Oracle operator submits AI result (off-chain process)
// This would be done by your AI backend service
await AIOracle.submitVerification(
    requestId,
    true, // approved
    95, // 95% confidence
    "Milestone completed. Revenue verified via bank statements and API data."
);

// 3. Automatic callback triggers AssetTokenizer.verifyMilestone()
// Token holders can now claim their share
```

#### **Claim Rewards**

```javascript
// Token holder claims their proportional share
const claimable = await AssetTokenizer.getClaimableAmount(tokenId, userAddress);
console.log("Claimable:", ethers.formatUnits(claimable, 6), "USDC");

await AssetTokenizer.claimRewards(tokenId);
```

---

## 💼 Use Case Examples

### Use Case 1: Freelancer Invoice Financing

**Scenario:** Alice completed a $10,000 project. Client pays in 60 days, but Alice needs cash now.

```javascript
const InvoiceNFT = await ethers.getContractAt("InvoiceNFT", INVOICE_NFT_ADDRESS);

// 1. Alice creates invoice NFT
const invoiceTx = await InvoiceNFT.createInvoice(
    CLIENT_ADDRESS, // debtor
    USDC_ADDRESS,
    ethers.parseUnits("10000", 6), // $10k
    Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60, // 60 days
    "ipfs://Qm...invoice-pdf",
    ethers.keccak256(ethers.toUtf8Bytes("Service Agreement"))
);

const invoiceId = (await invoiceTx.wait()).logs[0].args.invoiceId;

// 2. AI Oracle verifies invoice authenticity
await AIOracle.requestVerification(
    INVOICE_NFT_ADDRESS,
    invoiceId,
    "invoice",
    "ipfs://Qm...proof"
);

// 3. Bob (financier) purchases invoice at 5% discount
const discountRate = await InvoiceNFT.calculateDiscountRate(invoiceId);
const offerAmount = ethers.parseUnits("9500", 6); // $9,500

await InvoiceNFT.financeInvoice(invoiceId, offerAmount);
// Alice receives $9,500 immediately
// Bob owns the invoice NFT

// 4. Client pays full $10k in 60 days
await InvoiceNFT.connect(client).payInvoice(invoiceId);
// Bob receives $10,000 (5% profit)
```

### Use Case 2: IP Rights Revenue Share

**Scenario:** Carol created a software library. She tokenizes future licensing revenue.

```javascript
// 1. Tokenize IP rights
const ipTokenId = await AssetTokenizer.tokenizeAsset(
    1, // AssetType.IP_RIGHTS
    DAI_ADDRESS,
    ethers.parseUnits("50000", 18), // $50k projected revenue
    1000, // 1000 shares
    Math.floor(Date.now() / 1000) + 730 * 24 * 60 * 60, // 2 years
    "ipfs://Qm...ip-documentation",
    ethers.keccak256(ethers.toUtf8Bytes("IP License Agreement"))
);

// 2. Carol sells 30% to investors
await AssetTokenizer.safeTransferFrom(
    carol.address,
    investor1.address,
    ipTokenId,
    300, // 30% of shares
    "0x"
);

// 3. Monthly revenue distribution
// Carol receives licensing payments and funds the contract
await AssetTokenizer.fundAsset(ipTokenId, ethers.parseUnits("5000", 18));

// 4. Investors claim proportional share
// Investor1 claims 30% of $5k = $1,500
await AssetTokenizer.connect(investor1).claimRewards(ipTokenId);
```

### Use Case 3: Project Milestone Escrow

**Scenario:** Dave hires Eve for a $30k project with 3 milestones.

```javascript
// 1. Create project asset
const projectId = await AssetTokenizer.tokenizeAsset(
    3, // AssetType.FUTURE_EARNINGS
    USDC_ADDRESS,
    ethers.parseUnits("30000", 6),
    1, // Single token (non-fractional)
    Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60,
    "ipfs://Qm...project-spec",
    ethers.keccak256(ethers.toUtf8Bytes("Service Agreement"))
);

// 2. Define milestones
await AssetTokenizer.createMilestone(projectId, "Design Phase", ethers.parseUnits("10000", 6), ...);
await AssetTokenizer.createMilestone(projectId, "Development Phase", ethers.parseUnits("15000", 6), ...);
await AssetTokenizer.createMilestone(projectId, "Deployment Phase", ethers.parseUnits("5000", 6), ...);

// 3. Dave funds escrow upfront
await AssetTokenizer.fundAsset(projectId, ethers.parseUnits("30000", 6));

// 4. Eve completes milestone 1
// AI Oracle verifies completion
await AIOracle.requestVerification(projectId, 0, "milestone", "ipfs://Qm...design-deliverables");

// 5. Eve claims $10k
await AssetTokenizer.connect(eve).claimRewards(projectId);
```

---

## 🔐 Security Features

### 1. **Oracle Verification**
- AI confidence scoring prevents low-quality approvals
- Manual override for edge cases
- Multi-oracle support (AI + Kleros)

### 2. **Access Control**
- Role-based permissions (TOKENIZER, ORACLE, VERIFIER)
- Upgradeable contracts (UUPS pattern)
- Reentrancy guards on all value transfers

### 3. **Legal Anchoring**
- `legalHash` field for binding agreements
- IPFS metadata for immutable documentation
- Dispute resolution integration

### 4. **Economic Security**
- Platform fees prevent spam
- Late payment penalties incentivize timely settlement
- Fractional ownership prevents single-point manipulation

---

## 📊 Gas Optimization

| Operation | Estimated Gas | Notes |
|-----------|--------------|-------|
| Tokenize Asset | ~250,000 | One-time setup |
| Create Milestone | ~80,000 | Per milestone |
| Verify Milestone | ~120,000 | Oracle callback |
| Fund Asset | ~90,000 | Per funding round |
| Claim Rewards | ~70,000 | Per claim |
| Create Invoice | ~180,000 | NFT mint + storage |
| Finance Invoice | ~150,000 | NFT transfer + payment |

**Optimization Tips:**
- Batch milestone creation
- Use calldata for large strings
- Claim rewards periodically (not per milestone)

---

## 🧪 Testing

```bash
# Run RWA test suite
npx hardhat test test/RWA.test.js

# Test coverage
npx hardhat coverage --testfiles "test/RWA.test.js"
```

---

## 🌐 Frontend Integration

### React Hook Example

```typescript
import { useContract, useSigner } from 'wagmi';
import AssetTokenizerABI from './abis/AssetTokenizer.json';

export function useAssetTokenizer() {
    const { data: signer } = useSigner();
    const contract = useContract({
        address: ASSET_TOKENIZER_ADDRESS,
        abi: AssetTokenizerABI,
        signerOrProvider: signer
    });

    const tokenizeAsset = async (params) => {
        const tx = await contract.tokenizeAsset(
            params.assetType,
            params.paymentToken,
            params.totalValue,
            params.totalSupply,
            params.maturityDate,
            params.metadataURI,
            params.legalHash
        );
        return await tx.wait();
    };

    const claimRewards = async (tokenId) => {
        const tx = await contract.claimRewards(tokenId);
        return await tx.wait();
    };

    return { tokenizeAsset, claimRewards };
}
```

---

## 🔮 Roadmap

### Phase 1: Core Infrastructure ✅
- [x] AssetTokenizer contract
- [x] InvoiceNFT contract
- [x] AIOracle integration
- [x] Deployment scripts

### Phase 2: Advanced Features (Q2 2026)
- [ ] Chainlink Functions integration for AI
- [ ] Kleros arbitration adapter
- [ ] Secondary market AMM for invoice trading
- [ ] Cross-chain asset bridging (CCIP)

### Phase 3: Enterprise Features (Q3 2026)
- [ ] KYC/AML integration
- [ ] Institutional custody support
- [ ] Regulatory compliance reporting
- [ ] Multi-signature asset issuance

---

## 📞 Support

- **Documentation**: [docs.polylance.io/rwa](https://docs.polylance.io/rwa)
- **Discord**: [discord.gg/polylance](https://discord.gg/polylance)
- **GitHub**: [github.com/polylance/rwa-module](https://github.com/polylance/rwa-module)

---

## ⚖️ Legal Disclaimer

This module facilitates on-chain representation of real-world assets. Users are responsible for:
- Ensuring legal compliance in their jurisdiction
- Obtaining necessary licenses for asset tokenization
- Maintaining off-chain legal agreements
- Complying with securities regulations

**The smart contracts do not constitute legal advice or financial services.**

---

**Built with ❤️ by the PolyLance Team**
