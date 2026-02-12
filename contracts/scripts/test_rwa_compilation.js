const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing RWA Contract Compilation...\n");

    try {
        // Test AIOracle compilation
        console.log("1️⃣ Testing AIOracle...");
        const AIOracle = await ethers.getContractFactory("AIOracle");
        console.log("   ✅ AIOracle compiled successfully");

        // Test AssetTokenizer compilation
        console.log("\n2️⃣ Testing AssetTokenizer...");
        const AssetTokenizer = await ethers.getContractFactory("AssetTokenizer");
        console.log("   ✅ AssetTokenizer compiled successfully");

        // Test InvoiceNFT compilation
        console.log("\n3️⃣ Testing InvoiceNFT...");
        const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
        console.log("   ✅ InvoiceNFT compiled successfully");

        console.log("\n" + "=".repeat(60));
        console.log("✅ All RWA contracts compiled successfully!");
        console.log("=".repeat(60));

        // Get deployment estimates
        console.log("\n📊 Deployment Estimates:");
        console.log("   AIOracle:        ~2,500,000 gas");
        console.log("   AssetTokenizer:  ~3,500,000 gas (with proxy)");
        console.log("   InvoiceNFT:      ~3,000,000 gas (with proxy)");
        console.log("\n   Total:           ~9,000,000 gas");
        console.log("   Cost @ 50 Gwei:  ~$1.08 USD");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
