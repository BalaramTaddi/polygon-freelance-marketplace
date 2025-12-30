const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment of FreelanceEscrow (UUPS Proxy)...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Biconomy Trusted Forwarder (Polygon Mainnet) or placeholder
    const TRUSTED_FORWARDER = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";

    const FreelanceEscrow = await ethers.getContractFactory("FreelanceEscrow");

    // Deploy Proxy with arguments: [initialOwner, trustedForwarder]
    const contract = await upgrades.deployProxy(FreelanceEscrow, [deployer.address, TRUSTED_FORWARDER], {
        kind: 'uups',
        initializer: 'initialize'
    });

    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("FreelanceEscrow Proxy deployed to:", address);

    // Update the frontend contract address automatically
    const frontendConfigPath = path.resolve(__dirname, "..", "..", "frontend", "src", "constants.js");
    const configContent = `export const CONTRACT_ADDRESS = "${address}";\n`;
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log("Updated frontend constants.js with new address.");

    console.log("\nNext Steps:");
    console.log("1. Wait for block explorer indexing.");
    console.log(`2. Verify: npx hardhat verify --network <network> ${address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
