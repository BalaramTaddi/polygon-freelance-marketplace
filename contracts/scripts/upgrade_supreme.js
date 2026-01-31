const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("🚀 Starting SUPREME PROTOCOL UPGRADE...");
    console.log("Deployer:", deployer.address);

    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, "(ChainId:", network.chainId.toString(), ")");

    const deploymentPath = path.join(__dirname, "deployment_addresses.json");
    let addresses = {};
    if (fs.existsSync(deploymentPath)) {
        addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    }

    const saveProgress = () => {
        fs.writeFileSync(deploymentPath, JSON.stringify(addresses, null, 2));
    };

    // 1. Upgrade FreelanceEscrow
    console.log("\n📦 Upgrading FreelanceEscrow to Supreme Level...");
    const Escrow = await ethers.getContractFactory("FreelanceEscrow");

    if (!addresses.FreelanceEscrow) {
        throw new Error("FreelanceEscrow proxy address not found in deployment_addresses.json");
    }

    const upgraded = await upgrades.upgradeProxy(addresses.FreelanceEscrow, Escrow);
    await upgraded.waitForDeployment();
    console.log("✅ FreelanceEscrow upgraded at:", await upgraded.getAddress());

    // 2. Deploy/Get FreelancerReputation
    console.log("\n🧪 Linking Reputation Oracle...");
    let reputationAddress = addresses.FreelancerReputation;
    if (!reputationAddress) {
        const Reputation = await ethers.getContractFactory("FreelancerReputation");
        const reputation = await upgrades.deployProxy(
            Reputation,
            [deployer.address, "https://api.polylance.com/reputation/{id}.json"],
            { kind: 'uups' }
        );
        await reputation.waitForDeployment();
        reputationAddress = await reputation.getAddress();
        addresses.FreelancerReputation = reputationAddress;
        saveProgress();
    }
    console.log("✅ Reputation Oracle at:", reputationAddress);

    // 3. Final Configuration
    console.log("\n⚙️ Configuring Supreme Parameters...");
    const escrow = await ethers.getContractAt("FreelanceEscrow", addresses.FreelanceEscrow);

    // Set Reputation Contract
    console.log("- Linking Reputation to Escrow...");
    await (await escrow.setReputationContract(reputationAddress)).wait();

    // Set Threshold
    console.log("- Setting Supreme Threshold to 10...");
    await (await escrow.setReputationThreshold(10)).wait();

    // Set Vault (if not set)
    if (!addresses.Vault) {
        addresses.Vault = deployer.address; // Default to deployer for now
    }
    console.log(`- Setting Vault to: ${addresses.Vault}`);
    await (await escrow.setVault(addresses.Vault)).wait();

    // Whitelist PolyToken for payments
    if (addresses.PolyToken) {
        console.log("- Whitelisting PolyToken...");
        await (await escrow.setTokenWhitelist(addresses.PolyToken, true)).wait();
    }

    console.log("\n👑 SUPREME UPGRADE COMPLETE!");
    console.log("Status: ZENITH_READY");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
