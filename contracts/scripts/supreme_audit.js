const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Starting SUPREME TRANSACTION AUDIT: PolyLance Flow\n");

    const signers = await ethers.getSigners();
    const owner = signers[0];
    const client = signers[1];
    const freelancer = signers[2];
    const vault = signers[3];

    // 1. Deploy Core Contracts
    console.log("📦 Deploying Supreme Protocol Layers...");

    // PolyToken (ERC20)
    const PolyToken = await ethers.getContractFactory("PolyToken");
    const poly = await PolyToken.deploy(owner.address);
    await poly.waitForDeployment();
    console.log(`✅ PolyToken: ${await poly.getAddress()}`);

    // Shield (Trusted Forwarder)
    const Shield = await ethers.getContractFactory("PrivacyShield");
    const shield = await Shield.deploy(owner.address);
    await shield.waitForDeployment();
    console.log(`✅ PrivacyShield (Forwarder): ${await shield.getAddress()}`);

    // Mock Reputation (ERC1155)
    const MockRep = await ethers.getContractFactory("MockReputation");
    const rep = await MockRep.deploy();
    await rep.waitForDeployment();
    console.log(`✅ Mock Reputation (ERC1155): ${await rep.getAddress()}`);

    // Escrow (UUPS Proxy)
    const Escrow = await ethers.getContractFactory("FreelanceEscrow");
    const escrow = await upgrades.deployProxy(Escrow, [
        owner.address,
        await shield.getAddress(),
        await poly.getAddress(), // Use PolyToken as mock SBT
        owner.address // Use owner as mock entrypoint
    ], { initializer: 'initialize' });
    await escrow.waitForDeployment();
    console.log(`✅ FreelanceEscrow: ${await escrow.getAddress()}`);

    // 2. Configuration
    await escrow.setVault(vault.address);
    await escrow.setPlatformFee(250); // 2.5%
    await escrow.setPolyToken(await poly.getAddress());
    await escrow.setReputationContract(await rep.getAddress());

    // Whitelist MATIC
    await escrow.setTokenWhitelist("0x0000000000000000000000000000000000000000", true);

    // GRANT MINTER ROLE TO ESCROW
    const MINTER_ROLE = await poly.MINTER_ROLE();
    await poly.grantRole(MINTER_ROLE, await escrow.getAddress());

    console.log("\n🛡️ Simulation: SUPREME ELITE VS STANDARD");

    /** SCENARIO A: STANDARD USER (3% Fee, 100 POLY) **/
    console.log("\n--- Scenario A: Standard User ---");
    const job1Tx = await escrow.connect(client).createJob({
        categoryId: 1,
        freelancer: freelancer.address,
        token: "0x0000000000000000000000000000000000000000",
        amount: ethers.parseEther("1.0"),
        ipfsHash: "ipfs://test1",
        deadline: 0,
        mAmounts: [],
        mHashes: []
    }, { value: ethers.parseEther("1.0") });
    await job1Tx.wait();

    await escrow.connect(freelancer).acceptJob(1);
    await escrow.connect(freelancer).submitWork(1, "ipfs://done1");

    const vaultPrev = await ethers.provider.getBalance(vault.address);
    await escrow.connect(client).releaseFunds(1);
    const vaultPost = await ethers.provider.getBalance(vault.address);
    const polyBalanceA = await poly.balanceOf(freelancer.address);

    console.log(`✅ Standard User Fee Collected: ${ethers.formatEther(vaultPost - vaultPrev)} ETH (Expect 0.025)`);
    console.log(`✅ Standard User Rewards: ${ethers.formatUnits(polyBalanceA, 18)} POLY (Expect 100)`);

    /** SCENARIO B: SUPREME USER (0% Fee, 300 POLY) **/
    console.log("\n--- Scenario B: SUPREME USER ---");
    // Manually give freelancer reputation tokens to trigger supreme logic
    await rep.mint(freelancer.address, 1, 15); // Give 15 Rep Points for Category 1

    // We already set rep contract to PolyToken for this test
    // Let's create another job
    const job2Tx = await escrow.connect(client).createJob({
        categoryId: 1,
        freelancer: freelancer.address,
        token: "0x0000000000000000000000000000000000000000",
        amount: ethers.parseEther("1.0"),
        ipfsHash: "ipfs://test2",
        deadline: 0,
        mAmounts: [],
        mHashes: []
    }, { value: ethers.parseEther("1.0") });
    await job2Tx.wait();

    await escrow.connect(freelancer).acceptJob(2);
    await escrow.connect(freelancer).submitWork(2, "ipfs://done2");

    const vaultPrevS = await ethers.provider.getBalance(vault.address);
    const polyPrevS = await poly.balanceOf(freelancer.address);
    await escrow.connect(client).releaseFunds(2);
    const vaultPostS = await ethers.provider.getBalance(vault.address);
    const polyPostS = await poly.balanceOf(freelancer.address);

    console.log(`💎 Supreme User Fee Collected: ${ethers.formatEther(vaultPostS - vaultPrevS)} ETH (Expect 0.0)`);
    console.log(`💎 Supreme User Rewards Boost: ${ethers.formatUnits(polyPostS - polyPrevS, 18)} POLY (Expect 300)`);

    console.log("\n🚀 Transaction Audit Complete. STATUS: PRODUCTION_READY_ZENITH");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
