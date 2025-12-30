const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
require('dotenv').config();

// Configuration for Polygon Amoy Testnet
const RPC_URL = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TRUSTED_FORWARDER = "0x0000000000000000000000000000000000000000"; // Placeholder for Amoy
const CCIP_ROUTER = "0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb88464"; // Amoy Router

if (!PRIVATE_KEY) {
    console.error("Missing PRIVATE_KEY in .env");
    process.exit(1);
}

async function main() {
    console.log("Connecting to Polygon Amoy Testnet...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Deploying with account: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);

    if (balance < ethers.parseEther("0.1")) {
        console.error("\n❌ INSUFFICIENT AMOY MATIC!");
        console.error("Please get free tokens from the faucet: https://faucet.polygon.technology/");
        process.exit(1);
    }

    // 1. Load Artifacts
    const escrowArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'FreelanceEscrow.json')));
    // Using same Proxy wrapper
    const proxyArtifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'MyProxy.json')));

    // 2. Deploy Implementation
    console.log("Deploying Implementation...");
    const EscrowFactory = new ethers.ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
    const implementation = await EscrowFactory.deploy();
    await implementation.waitForDeployment();
    const implAddress = await implementation.getAddress();
    console.log(`Implementation deployed at: ${implAddress}`);

    // 3. Prepare Initialization Data
    // initialize(address initialOwner, address trustedForwarder, address ccipRouter)
    console.log("Encoding initialization data...");
    const escrowInterface = new ethers.Interface(escrowArtifact.abi);
    const initData = escrowInterface.encodeFunctionData("initialize", [wallet.address, TRUSTED_FORWARDER, CCIP_ROUTER]);

    // 4. Deploy Proxy
    console.log("Deploying Proxy (UUPS)...");
    const ProxyFactory = new ethers.ContractFactory(proxyArtifact.abi, proxyArtifact.bytecode, wallet);
    const proxy = await ProxyFactory.deploy(implAddress, initData);
    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();
    console.log(`🎉 Proxy deployed at: ${proxyAddress}`);

    // 5. Update Frontend Constants (optional, maybe create constants_amoy.js)
    console.log("\nDeployment Complete!");
    console.log(`Contract Address: ${proxyAddress}`);
    console.log("Now you can test Cross-Chain flows by sending CCIP messages to this address.");
}

main().catch(console.error);
