# RWA Module - End-to-End Testing Guide

## 🎯 Testing Strategy

Since local Hardhat testing is blocked by Node.js v22 compatibility issues, we'll use **direct testnet deployment and testing**.

---

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] `.env` file configured with `PRIVATE_KEY`
- [ ] Wallet funded with MATIC on Polygon Amoy
- [ ] `POLYGONSCAN_API_KEY` set for contract verification
- [ ] OpenAI API key ready for AI Oracle backend

### 2. Contract Compilation
```bash
cd contracts
npx hardhat compile
```

**Expected Output:**
```
Compiled 114 Solidity files successfully (evm target: cancun)
```

### 3. Check Wallet Balance
```bash
# Check your balance
cast balance $YOUR_ADDRESS --rpc-url https://rpc-amoy.polygon.technology

# Get testnet MATIC from faucet if needed
# https://faucet.polygon.technology/
```

---

## 🚀 Deployment Steps

### Step 1: Deploy AIOracle

Create `scripts/deploy_ai_oracle_only.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
    console.log("📡 Deploying AIOracle...");
    
    const AIOracle = await ethers.getContractFactory("AIOracle");
    const aiOracle = await AIOracle.deploy();
    await aiOracle.waitForDeployment();
    
    const address = await aiOracle.getAddress();
    console.log("✅ AIOracle deployed to:", address);
    
    // Save address
    const fs = require("fs");
    fs.writeFileSync("ai_oracle_address.txt", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
```

Deploy:
```bash
npx hardhat run scripts/deploy_ai_oracle_only.js --network polygon_amoy
```

### Step 2: Verify Contract

```bash
# Get address from output
AI_ORACLE_ADDRESS=$(cat ai_oracle_address.txt)

# Verify on PolygonScan
npx hardhat verify --network polygon_amoy $AI_ORACLE_ADDRESS
```

### Step 3: Grant Oracle Role

```javascript
// scripts/grant_oracle_role.js
const { ethers } = require("hardhat");

async function main() {
    const AI_ORACLE_ADDRESS = "0x..."; // From deployment
    const OPERATOR_ADDRESS = "0x..."; // Your wallet
    
    const aiOracle = await ethers.getContractAt("AIOracle", AI_ORACLE_ADDRESS);
    
    const ORACLE_OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_OPERATOR_ROLE"));
    
    const tx = await aiOracle.grantRole(ORACLE_OPERATOR_ROLE, OPERATOR_ADDRESS);
    await tx.wait();
    
    console.log("✅ Granted ORACLE_OPERATOR_ROLE");
}

main();
```

---

## 🧪 Testing Scenarios

### Test 1: Create Verification Request

```javascript
// From frontend or Hardhat console
const aiOracle = await ethers.getContractAt("AIOracle", AI_ORACLE_ADDRESS);

const tx = await aiOracle.requestVerification(
    "0x1234...", // target contract (can be any address for testing)
    1, // target ID
    "milestone",
    "ipfs://QmTest123"
);

const receipt = await tx.wait();
console.log("Request ID:", receipt.logs[0].args.requestId);
```

### Test 2: AI Backend Processes Request

```bash
# In backend directory
cd backend
python ai_oracle_service.py
```

**Expected Output:**
```
🎧 Listening for verification requests...
🔍 Processing verification request #1
   Type: milestone
   Result: ✅ APPROVED
   Confidence: 85%
✅ Submitted verification for request 1
```

### Test 3: Check Verification Result

```javascript
const request = await aiOracle.getRequest(1);
console.log("Status:", request.status); // Should be APPROVED (1)
console.log("Confidence:", request.confidence); // e.g., 85
console.log("AI Response:", request.aiResponse);
```

---

## 📊 Full Integration Test

### Scenario: Invoice Financing Flow

#### 1. Deploy InvoiceNFT (Manual)

```javascript
// scripts/deploy_invoice_nft.js
const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    const invoiceNFT = await upgrades.deployProxy(
        InvoiceNFT,
        [deployer.address, 250], // fee collector, 2.5% fee
        { kind: "uups" }
    );
    
    await invoiceNFT.waitForDeployment();
    console.log("✅ InvoiceNFT:", await invoiceNFT.getAddress());
}

main();
```

#### 2. Create Invoice

```javascript
const invoiceNFT = await ethers.getContractAt("InvoiceNFT", INVOICE_NFT_ADDRESS);

const tx = await invoiceNFT.createInvoice(
    "0xDebtor...", // debtor address
    "0x0000000000000000000000000000000000000000", // native token
    ethers.parseEther("10"), // 10 MATIC
    Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60, // 60 days
    "ipfs://QmInvoice123",
    ethers.keccak256(ethers.toUtf8Bytes("Service Agreement"))
);

const receipt = await tx.wait();
const invoiceId = receipt.logs[0].args.invoiceId;
console.log("Invoice ID:", invoiceId);
```

#### 3. Request AI Verification

```javascript
const aiOracle = await ethers.getContractAt("AIOracle", AI_ORACLE_ADDRESS);

const tx = await aiOracle.requestVerification(
    INVOICE_NFT_ADDRESS,
    invoiceId,
    "invoice",
    "ipfs://QmInvoiceProof123"
);

await tx.wait();
console.log("Verification requested");
```

#### 4. AI Backend Verifies (Automatic)

The AI Oracle service should automatically:
- Detect the verification request
- Fetch proof from IPFS
- Analyze with GPT-4
- Submit result to contract

#### 5. Finance Invoice

```javascript
const [, financier] = await ethers.getSigners();

const tx = await invoiceNFT.connect(financier).financeInvoice(
    invoiceId,
    ethers.parseEther("9.5"), // 5% discount
    { value: ethers.parseEther("9.5") }
);

await tx.wait();
console.log("Invoice financed!");
```

#### 6. Debtor Pays

```javascript
const [, , debtor] = await ethers.getSigners();

const tx = await invoiceNFT.connect(debtor).payInvoice(
    invoiceId,
    { value: ethers.parseEther("10") }
);

await tx.wait();
console.log("Invoice paid! Financier earned 0.5 MATIC profit");
```

---

## 📈 Success Metrics

### Contract Deployment
- ✅ AIOracle deployed and verified
- ✅ InvoiceNFT deployed and verified
- ✅ AssetTokenizer deployed and verified
- ✅ All roles granted correctly

### AI Backend
- ✅ Service running without errors
- ✅ Events detected and processed
- ✅ Verifications submitted successfully
- ✅ Gas costs within budget (~120k gas)

### End-to-End Flow
- ✅ Invoice created successfully
- ✅ AI verification completed (80%+ confidence)
- ✅ Invoice financed at discount
- ✅ Debtor payment processed
- ✅ Financier received profit

---

## 🐛 Troubleshooting

### Issue: Deployment Fails
**Cause**: Hardhat v2 + Node.js v22 incompatibility

**Solution**: Use Node.js v20 LTS
```bash
nvm install 20
nvm use 20
cd contracts && npm install
npx hardhat run scripts/deploy_ai_oracle_only.js --network polygon_amoy
```

### Issue: "Insufficient funds"
**Solution**: Get testnet MATIC
```bash
# Visit faucet
open https://faucet.polygon.technology/

# Or use Alchemy faucet
open https://www.alchemy.com/faucets/polygon-amoy
```

### Issue: AI Backend Not Processing
**Checklist**:
- [ ] ORACLE_OPERATOR_ROLE granted?
- [ ] Correct AI_ORACLE_ADDRESS in .env?
- [ ] OpenAI API key valid?
- [ ] IPFS gateway accessible?

---

## 📊 Test Results Template

```markdown
## RWA Module Test Results

**Date**: 2026-02-12
**Network**: Polygon Amoy
**Tester**: Akhil Muvva

### Deployment
- AIOracle: 0x... ✅
- InvoiceNFT: 0x... ✅
- AssetTokenizer: 0x... ✅

### AI Backend
- Service Status: Running ✅
- Requests Processed: 5
- Average Confidence: 87%
- Success Rate: 100%

### Invoice Financing Test
- Invoice Created: ✅
- AI Verified: ✅ (92% confidence)
- Financed: ✅ (5% discount)
- Paid: ✅
- Profit: 0.5 MATIC

### Gas Costs
- Create Invoice: 180,000 gas
- Request Verification: 85,000 gas
- Submit Verification: 120,000 gas
- Finance Invoice: 150,000 gas
- Pay Invoice: 95,000 gas
- **Total**: 630,000 gas (~$0.76 @ 50 Gwei)

### Issues Found
- None

### Recommendations
- Deploy to mainnet
- Increase AI confidence threshold to 85%
- Add more IPFS gateways for redundancy
```

---

## 🎯 Next Steps After Testing

1. **Security Audit**
   - Engage external auditor
   - Review AI Oracle logic
   - Test edge cases

2. **Mainnet Deployment**
   - Deploy to Polygon mainnet
   - Fund contracts with real MATIC
   - Configure production settings

3. **Frontend Integration**
   - Connect React components
   - Test user flows
   - Add error handling

4. **Marketing Launch**
   - Announce RWA module
   - Create demo videos
   - Onboard early users

---

**Ready to revolutionize freelance finance! 🚀**
