const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting PolyLance Zenith: Supreme Mainnet Deployment...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer Address:", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "MATIC");

    // 1. Deploy PolyToken
    console.log("Deploying PolyToken...");
    const PolyToken = await ethers.getContractFactory("PolyToken");
    const token = await PolyToken.deploy(deployer.address);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("✅ PolyToken:", tokenAddress);

    // 2. Deploy Reputation (UUPS)
    console.log("Deploying FreelancerReputation...");
    const Rep = await ethers.getContractFactory("FreelancerReputation");
    const rep = await upgrades.deployProxy(Rep, [deployer.address, "https://api.polylance.com/metadata/rep/{id}"], { kind: "uups" });
    await rep.waitForDeployment();
    const repAddress = await rep.getAddress();
    console.log("✅ Reputation (Proxy):", repAddress);

    // 3. Deploy SBT
    console.log("Deploying FreelanceSBT...");
    const SBT = await ethers.getContractFactory("FreelanceSBT");
    const sbt = await SBT.deploy(deployer.address, deployer.address); // Admin & Minter
    await sbt.waitForDeployment();
    const sbtAddress = await sbt.getAddress();
    console.log("✅ FreelanceSBT:", sbtAddress);

    // 4. Deploy Forwarder (for Gasless transations)
    console.log("Deploying PolyLanceForwarder...");
    const Forwarder = await ethers.getContractFactory("PolyLanceForwarder");
    const forwarder = await Forwarder.deploy();
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log("✅ Forwarder:", forwarderAddress);

    // 5. Deploy Escrow (UUPS)
    console.log("Deploying FreelanceEscrow...");
    const Escrow = await ethers.getContractFactory("FreelanceEscrow");
    const escrow = await upgrades.deployProxy(Escrow, [
        deployer.address,
        forwarderAddress,
        sbtAddress,
        deployer.address // Dummy entrypoint for now
    ], { kind: "uups" });
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("✅ FreelanceEscrow (Proxy):", escrowAddress);

    // 6. Deploy Completion SBT
    console.log("Deploying PolyCompletionSBT...");
    const CompletionSBT = await ethers.getContractFactory("PolyCompletionSBT");
    const cert = await CompletionSBT.deploy(deployer.address, escrowAddress);
    await cert.waitForDeployment();
    const certAddress = await cert.getAddress();
    console.log("✅ Completion Cert:", certAddress);

    // 7. Post-Deployment Linking
    console.log("Linking contracts...");
    await escrow.setPolyToken(tokenAddress);
    await escrow.setReputationContract(repAddress);
    await escrow.setSBTContract(sbtAddress);
    await escrow.setCompletionCertContract(certAddress);
    await escrow.setVault(deployer.address); // Update to vault address in real prod

    // Whitelist typical tokens (USDC, USDT on Polygon)
    const USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
    await escrow.setTokenWhitelist(USDC, true);

    // Grant roles to escrow
    const MINTER_ROLE = await token.MINTER_ROLE();
    await token.grantRole(MINTER_ROLE, escrowAddress);
    await rep.grantRole(MINTER_ROLE, escrowAddress);
    await sbt.grantRole(MINTER_ROLE, escrowAddress);

    const addresses = {
        PolyToken: tokenAddress,
        FreelancerReputation: repAddress,
        FreelanceSBT: sbtAddress,
        Forwarder: forwarderAddress,
        FreelanceEscrow: escrowAddress,
        PolyCompletionSBT: certAddress,
        Network: "Polygon Mainnet",
        Deployer: deployer.address,
        Timestamp: new Date().toISOString()
    };

    const filePath = path.join(__dirname, "deployment_mainnet_zenith.json");
    fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));
    console.log("✅ Deployment summary saved to:", filePath);

    console.log("\n🚀 ZENITH PROTOCOL ONLINE. The world of work has been upgraded.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
