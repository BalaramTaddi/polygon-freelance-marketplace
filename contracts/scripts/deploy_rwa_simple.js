const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying RWA Tokenization Suite (Non-Upgradeable Version)...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

    // Configuration
    const PLATFORM_FEE_BPS = 250; // 2.5%
    const FEE_COLLECTOR = deployer.address;

    // 1. Deploy AIOracle
    console.log("📡 Deploying AIOracle...");
    const AIOracle = await ethers.getContractFactory("AIOracle");
    const aiOracle = await AIOracle.deploy();
    await aiOracle.waitForDeployment();
    const aiOracleAddress = await aiOracle.getAddress();
    console.log("✅ AIOracle deployed to:", aiOracleAddress, "\n");

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 RWA Tokenization Suite Deployment Complete!\n");
    console.log("Contract Addresses:");
    console.log("  AIOracle:        ", aiOracleAddress);
    console.log("\nConfiguration:");
    console.log("  Platform Fee:    ", PLATFORM_FEE_BPS / 100, "%");
    console.log("  Fee Collector:   ", FEE_COLLECTOR);
    console.log("=".repeat(60));

    // Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: Number((await ethers.provider.getNetwork()).chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            AIOracle: aiOracleAddress
        },
        configuration: {
            platformFeeBps: PLATFORM_FEE_BPS,
            feeCollector: FEE_COLLECTOR
        }
    };

    const fs = require("fs");
    fs.writeFileSync(
        "rwa_deployment_simple.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\n📝 Deployment info saved to rwa_deployment_simple.json");

    console.log("\n🔍 Verify contract with:");
    console.log(`npx hardhat verify --network polygon_amoy ${aiOracleAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
