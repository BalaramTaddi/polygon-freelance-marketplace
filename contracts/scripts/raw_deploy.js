const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const RPC_URL = process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TRUSTED_FORWARDER = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8"; // Biconomy Polygon Mainnet

if (!PRIVATE_KEY) {
    console.error("Missing PRIVATE_KEY in .env");
    process.exit(1);
}

async function main() {
    console.log("Connecting to Polygon Mainnet...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Deploying with account: ${wallet.address}`);

    // 1. Load Artifacts
    const escrowArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'FreelanceEscrow.json')));
    const proxyArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'MyProxy.json')));

    // 2. Deploy Implementation
    console.log("Deploying Implementation...");
    const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
    const implementation = await EscrowFactory.deploy();
    await implementation.waitForDeployment();
    const implAddress = await implementation.getAddress();
    console.log(`Implementation deployed at: ${implAddress}`);

    // 3. Prepare Initialization Data
    console.log("Encoding initialization data...");
    const escrowInterface = new ethers.Interface(escrowArtifact.abi);
    // initialize(address initialOwner, address trustedForwarder)
    const initData = escrowInterface.encodeFunctionData("initialize", [wallet.address, TRUSTED_FORWARDER]);

    // 4. Deploy Proxy
    console.log("Deploying Proxy (UUPS)...");
    const ProxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
    // constructor(address implementation, bytes memory _data)
    const proxy = await ProxyFactory.deploy(implAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log(`🎉 Proxy deployed at: ${proxyAddress}`);

    // 5. Update Frontend
    const frontendConfigPath = path.resolve(__dirname, "..", "..", "frontend", "src", "constants.js");
    const configContent = `export const CONTRACT_ADDRESS = "${proxyAddress}";\n`;
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log("Updated frontend constants.js");
}

main().catch(console.error);
