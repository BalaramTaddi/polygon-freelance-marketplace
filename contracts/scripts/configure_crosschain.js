const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Configure cross-chain connections after deploying to multiple chains
 * This script sets up peers, token mappings, and supported chains
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;

    console.log("\n===========================================");
    console.log("⚙️  Cross-Chain Configuration Script");
    console.log("===========================================\n");
    console.log("Network:", network);
    console.log("Deployer:", deployer.address, "\n");

    // Load deployment info for current network
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFile = path.join(deploymentsDir, `${network}_crosschain.json`);

    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }

    const currentDeployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📄 Loaded deployment info for", currentDeployment.chainName);

    // Load all other network deployments
    const allDeployments = {};
    const deploymentFiles = fs.readdirSync(deploymentsDir)
        .filter(f => f.endsWith("_crosschain.json"));

    for (const file of deploymentFiles) {
        const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, file), "utf8"));
        allDeployments[deployment.network] = deployment;
    }

    console.log(`\n📚 Found ${Object.keys(allDeployments).length} network deployments:`);
    for (const [net, dep] of Object.entries(allDeployments)) {
        console.log(`  - ${dep.chainName} (${net})`);
    }

    // Get contract instances
    const ccipBridge = await hre.ethers.getContractAt(
        "CCIPTokenBridge",
        currentDeployment.contracts.ccipBridge
    );

    const escrowManager = await hre.ethers.getContractAt(
        "CrossChainEscrowManager",
        currentDeployment.contracts.escrowManager
    );

    const omniReputation = await hre.ethers.getContractAt(
        "OmniReputation",
        currentDeployment.contracts.omniReputation
    );

    const omniGovernance = await hre.ethers.getContractAt(
        "OmniGovernance",
        currentDeployment.contracts.omniGovernance
    );

    const omniDispute = await hre.ethers.getContractAt(
        "OmniDispute",
        currentDeployment.contracts.omniDispute
    );

    // ============================================
    // 1. Configure CCIP Bridge - Supported Chains
    // ============================================
    console.log("\n⚙️  Configuring CCIP Bridge supported chains...");

    for (const [net, dep] of Object.entries(allDeployments)) {
        if (net === network) continue; // Skip current network

        console.log(`  - Adding ${dep.chainName} (selector: ${dep.config.chainSelector})...`);
        const tx = await ccipBridge.setSupportedChain(dep.config.chainSelector, true);
        await tx.wait();
        console.log("    ✓ Added");
    }

    // ============================================
    // 2. Configure Token Mappings
    // ============================================
    console.log("\n⚙️  Configuring token mappings...");

    const currentTokens = currentDeployment.tokens || {};

    for (const [net, dep] of Object.entries(allDeployments)) {
        if (net === network) continue;

        const remoteTokens = dep.tokens || {};

        // Map USDC across chains
        if (currentTokens.USDC && remoteTokens.USDC) {
            console.log(`  - Mapping USDC to ${dep.chainName}...`);
            const tx = await ccipBridge.setTokenMapping(
                currentTokens.USDC,
                dep.config.chainSelector,
                remoteTokens.USDC
            );
            await tx.wait();
            console.log("    ✓ Mapped");
        }

        // Map USDT across chains
        if (currentTokens.USDT && remoteTokens.USDT) {
            console.log(`  - Mapping USDT to ${dep.chainName}...`);
            const tx = await ccipBridge.setTokenMapping(
                currentTokens.USDT,
                dep.config.chainSelector,
                remoteTokens.USDT
            );
            await tx.wait();
            console.log("    ✓ Mapped");
        }

        // Map DAI across chains
        if (currentTokens.DAI && remoteTokens.DAI) {
            console.log(`  - Mapping DAI to ${dep.chainName}...`);
            const tx = await ccipBridge.setTokenMapping(
                currentTokens.DAI,
                dep.config.chainSelector,
                remoteTokens.DAI
            );
            await tx.wait();
            console.log("    ✓ Mapped");
        }
    }

    // ============================================
    // 3. Configure Escrow Manager - Remote Managers
    // ============================================
    console.log("\n⚙️  Configuring Escrow Manager remote managers...");

    for (const [net, dep] of Object.entries(allDeployments)) {
        if (net === network) continue;

        console.log(`  - Setting remote manager for ${dep.chainName}...`);
        const tx1 = await escrowManager.setRemoteManager(
            dep.config.chainSelector,
            dep.contracts.escrowManager
        );
        await tx1.wait();

        const tx2 = await escrowManager.setSupportedChain(dep.config.chainSelector, true);
        await tx2.wait();
        console.log("    ✓ Configured");
    }

    // ============================================
    // 4. Configure LayerZero Peers
    // ============================================
    console.log("\n⚙️  Configuring LayerZero peers...");

    for (const [net, dep] of Object.entries(allDeployments)) {
        if (net === network) continue;

        console.log(`  - Setting peers for ${dep.chainName} (EID: ${dep.config.lzEid})...`);

        // 1. Reputation Peer
        const repPeer = hre.ethers.zeroPadValue(dep.contracts.omniReputation, 32);
        await (await omniReputation.setPeer(dep.config.lzEid, repPeer)).wait();
        console.log("    ✓ Reputation Peer set");

        // 2. Governance Peer
        const govPeer = hre.ethers.zeroPadValue(dep.contracts.omniGovernance, 32);
        await (await omniGovernance.setPeer(dep.config.lzEid, govPeer)).wait();
        console.log("    ✓ Governance Peer set");

        // 3. Dispute Peer
        const disputePeer = hre.ethers.zeroPadValue(dep.contracts.omniDispute, 32);
        await (await omniDispute.setPeer(dep.config.lzEid, disputePeer)).wait();
        console.log("    ✓ Dispute Peer set");
    }

    // ============================================
    // 5. Save Configuration
    // ============================================
    const configInfo = {
        network: network,
        timestamp: new Date().toISOString(),
        configuredChains: Object.keys(allDeployments).filter(n => n !== network),
        ccipBridge: {
            supportedChains: Object.values(allDeployments)
                .filter(d => d.network !== network)
                .map(d => ({
                    name: d.chainName,
                    selector: d.config.chainSelector
                }))
        },
        escrowManager: {
            remoteManagers: Object.values(allDeployments)
                .filter(d => d.network !== network)
                .map(d => ({
                    name: d.chainName,
                    selector: d.config.chainSelector,
                    address: d.contracts.escrowManager
                }))
        },
        omniReputation: {
            peers: Object.values(allDeployments)
                .filter(d => d.network !== network)
                .map(d => ({
                    name: d.chainName,
                    eid: d.config.lzEid,
                    address: d.contracts.omniReputation
                }))
        },
        omniGovernance: {
            peers: Object.values(allDeployments)
                .filter(d => d.network !== network)
                .map(d => ({
                    name: d.chainName,
                    eid: d.config.lzEid,
                    address: d.contracts.omniGovernance
                }))
        },
        omniDispute: {
            peers: Object.values(allDeployments)
                .filter(d => d.network !== network)
                .map(d => ({
                    name: d.chainName,
                    eid: d.config.lzEid,
                    address: d.contracts.omniDispute
                }))
        }
    };

    const configFile = path.join(deploymentsDir, `${network}_config.json`);
    fs.writeFileSync(configFile, JSON.stringify(configInfo, null, 2));
    console.log("\n💾 Configuration saved to:", configFile);

    // ============================================
    // 6. Print Summary
    // ============================================
    console.log("\n===========================================");
    console.log("✅ Configuration Complete!");
    console.log("===========================================");
    console.log("\nConfigured Connections:");
    console.log(`  CCIP Supported Chains:   ${configInfo.ccipBridge.supportedChains.length}`);
    console.log(`  Escrow Remote Managers:  ${configInfo.escrowManager.remoteManagers.length}`);
    console.log(`  LayerZero Peers:         ${configInfo.omniReputation.peers.length}`);
    console.log("\n===========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
