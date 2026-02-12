const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Deploying RWA Tokenization Suite...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

    // Configuration
    const PLATFORM_FEE_BPS = 250; // 2.5%
    const FEE_COLLECTOR = deployer.address; // Update with actual fee collector
    const BASE_URI = "ipfs://";

    // 1. Deploy AIOracle
    console.log("📡 Deploying AIOracle...");
    const AIOracle = await ethers.getContractFactory("AIOracle");
    const aiOracle = await AIOracle.deploy();
    await aiOracle.waitForDeployment();
    const aiOracleAddress = await aiOracle.getAddress();
    console.log("✅ AIOracle deployed to:", aiOracleAddress, "\n");

    // 2. Deploy AssetTokenizer (Upgradeable)
    console.log("💎 Deploying AssetTokenizer (UUPS Proxy)...");
    const AssetTokenizer = await ethers.getContractFactory("AssetTokenizer");
    const assetTokenizer = await upgrades.deployProxy(
        AssetTokenizer,
        [BASE_URI, FEE_COLLECTOR, PLATFORM_FEE_BPS],
        { kind: "uups" }
    );
    await assetTokenizer.waitForDeployment();
    const assetTokenizerAddress = await assetTokenizer.getAddress();
    console.log("✅ AssetTokenizer deployed to:", assetTokenizerAddress, "\n");

    // 3. Deploy InvoiceNFT (Upgradeable)
    console.log("📄 Deploying InvoiceNFT (UUPS Proxy)...");
    const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
    const invoiceNFT = await upgrades.deployProxy(
        InvoiceNFT,
        [FEE_COLLECTOR, PLATFORM_FEE_BPS],
        { kind: "uups" }
    );
    await invoiceNFT.waitForDeployment();
    const invoiceNFTAddress = await invoiceNFT.getAddress();
    console.log("✅ InvoiceNFT deployed to:", invoiceNFTAddress, "\n");

    // 4. Configure Oracle Integration
    console.log("⚙️  Configuring Oracle Integration...");

    // Grant Oracle role to AIOracle contract
    const ORACLE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
    await assetTokenizer.grantRole(ORACLE_ROLE, aiOracleAddress);
    console.log("✅ Granted ORACLE_ROLE to AIOracle in AssetTokenizer");

    // Set AIOracle address in contracts
    await assetTokenizer.setAIOracle(aiOracleAddress);
    console.log("✅ Set AIOracle in AssetTokenizer");

    const VERIFIER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VERIFIER_ROLE"));
    await invoiceNFT.grantRole(VERIFIER_ROLE, aiOracleAddress);
    await invoiceNFT.setAIOracle(aiOracleAddress);
    console.log("✅ Set AIOracle in InvoiceNFT\n");

    // 5. Grant Consumer Role to contracts in AIOracle
    const CONSUMER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONSUMER_ROLE"));
    await aiOracle.grantRole(CONSUMER_ROLE, assetTokenizerAddress);
    await aiOracle.grantRole(CONSUMER_ROLE, invoiceNFTAddress);
    console.log("✅ Granted CONSUMER_ROLE to contracts in AIOracle\n");

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 RWA Tokenization Suite Deployment Complete!\n");
    console.log("Contract Addresses:");
    console.log("  AIOracle:        ", aiOracleAddress);
    console.log("  AssetTokenizer:  ", assetTokenizerAddress);
    console.log("  InvoiceNFT:      ", invoiceNFTAddress);
    console.log("\nConfiguration:");
    console.log("  Platform Fee:    ", PLATFORM_FEE_BPS / 100, "%");
    console.log("  Fee Collector:   ", FEE_COLLECTOR);
    console.log("=".repeat(60));

    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            AIOracle: aiOracleAddress,
            AssetTokenizer: assetTokenizerAddress,
            InvoiceNFT: invoiceNFTAddress
        },
        configuration: {
            platformFeeBps: PLATFORM_FEE_BPS,
            feeCollector: FEE_COLLECTOR,
            baseURI: BASE_URI
        }
    };

    const fs = require("fs");
    fs.writeFileSync(
        "rwa_deployment.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n📝 Deployment info saved to rwa_deployment.json");

    // Verification commands
    console.log("\n🔍 Verify contracts with:");
    console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${aiOracleAddress}`);
    console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${assetTokenizerAddress}`);
    console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${invoiceNFTAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
