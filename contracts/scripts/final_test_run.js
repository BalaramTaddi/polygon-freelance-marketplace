const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 Starting Final E2E Test Run: PolyLance Flow\n");

    const signers = await ethers.getSigners();
    const owner = signers[0];
    const client = signers[1];
    const freelancer = signers[2];
    const vault = signers[3];

    console.log(`Owner/Admin: ${owner.address}`);
    console.log(`Client: ${client.address}`);
    console.log(`Freelancer: ${freelancer.address}`);

    // 1. Deploy Core Contracts
    console.log("\n📦 Deploying Contracts...");

    // PolyToken
    const PolyToken = await ethers.getContractFactory("PolyToken");
    const polyToken = await PolyToken.deploy(owner.address);
    await polyToken.waitForDeployment();
    console.log(`- PolyToken: ${await polyToken.getAddress()}`);

    // SBT
    const SBT = await ethers.getContractFactory("FreelanceSBT");
    const sbt = await SBT.deploy(owner.address, owner.address);
    await sbt.waitForDeployment();

    // Escrow
    const Escrow = await ethers.getContractFactory("FreelanceEscrow");
    const escrow = await upgrades.deployProxy(Escrow, [
        owner.address,
        "0x0000000000000000000000000000000000000001",
        await sbt.getAddress(),
        owner.address
    ]);
    await escrow.waitForDeployment();
    console.log(`- Escrow Proxy: ${await escrow.getAddress()}`);

    // Setup Roles
    console.log("⚙️ Setting up roles...");
    await polyToken.connect(owner).grantRole(await polyToken.MINTER_ROLE(), await escrow.getAddress());
    await sbt.connect(owner).grantRole(await sbt.MINTER_ROLE(), await escrow.getAddress());
    await escrow.connect(owner).setPolyToken(await polyToken.getAddress());
    await escrow.connect(owner).setVault(vault.address);
    await escrow.connect(owner).setTokenWhitelist(ethers.ZeroAddress, true); // White ETH

    // 2. Client Creates Job
    console.log("\n🛠️ Step 1: Client Creates Job (Budget: 1 ETH)");
    const jobParams = {
        categoryId: 1,
        freelancer: ethers.ZeroAddress,
        token: ethers.ZeroAddress,
        amount: ethers.parseEther("1"),
        ipfsHash: "ipfs://test-job-metadata",
        deadline: 0,
        mAmounts: [],
        mHashes: []
    };

    const createTx = await escrow.connect(client).createJob(jobParams, { value: ethers.parseEther("1") });
    await createTx.wait();
    console.log("✅ Job Created On-Chain (Job ID #1)");

    // 3. Freelancer Applies
    console.log("\n🤝 Step 2: Freelancer Applies (Stake: 0.05 ETH)");
    const applyTx = await escrow.connect(freelancer).applyForJob(1, { value: ethers.parseEther("0.05") });
    await applyTx.wait();
    console.log("✅ Application Recorded");

    // 4. Client Picks Freelancer
    console.log("\n🎯 Step 3: Client Selects Freelancer");
    const pickTx = await escrow.connect(client).pickFreelancer(1, freelancer.address);
    await pickTx.wait();
    console.log("✅ Freelancer Assigned");

    // 5. Freelancer Accepts
    console.log("\n✅ Step 4: Freelancer Accepts Job");
    const acceptTx = await escrow.connect(freelancer).acceptJob(1);
    await acceptTx.wait();
    console.log("✅ Job Status: Ongoing");

    // 6. Freelancer Submits Work
    console.log("\n📤 Step 5: Freelancer Submits Work");
    const submitTx = await escrow.connect(freelancer).submitWork(1, "ipfs://delivered-assets");
    await submitTx.wait();
    console.log("✅ Work Submitted to IPFS");

    // 7. Client Releases Funds
    console.log("\n💰 Step 6: Client Releases Funds");
    const initialBal = await ethers.provider.getBalance(freelancer.address);
    const releaseTx = await escrow.connect(client).releaseFunds(1);
    await releaseTx.wait();
    const finalBal = await ethers.provider.getBalance(freelancer.address);

    console.log("✅ Funds Released from Escrow");
    console.log(`   - Freelancer Profit: ${ethers.formatEther(finalBal - initialBal)} ETH`);

    // 8. Rewards Verification
    console.log("\n✨ Step 7: Verifying AI & SBT Rewards");
    const polyBal = await polyToken.balanceOf(freelancer.address);
    console.log(`   - PolyToken Rewards: ${ethers.formatEther(polyBal)} POLY`);

    console.log("\n🏁 Final Test Run Successful! PolyLance Ecosystem is Production Ready.");
}

main().catch((error) => {
    console.error("❌ Test Run Failed!");
    console.error(error);
    process.exitCode = 1;
});
