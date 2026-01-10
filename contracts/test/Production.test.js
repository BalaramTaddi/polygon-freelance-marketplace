const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("PolyLance Production Suite", function () {
    let Escrow, Token, MockERC20, SBT, Reputation, Insurance;
    let escrow, polyToken, usdc, sbt, reputation, insurance;
    let owner, client, freelancer, arbitrator, vault, other;

    const INITIAL_SUPPLY = ethers.parseEther("1000000");
    const JOB_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
    const REWARD_AMOUNT = ethers.parseEther("100");

    beforeEach(async function () {
        [owner, client, freelancer, arbitrator, vault, other] = await ethers.getSigners();

        // 1. Deploy Mock USDC
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20Factory.deploy("USD Coin", "USDC");
        await usdc.waitForDeployment();

        // 2. Deploy PolyToken
        const TokenFactory = await ethers.getContractFactory("PolyToken");
        polyToken = await TokenFactory.deploy(owner.address);
        await polyToken.waitForDeployment();

        // 3. Deploy InsurancePool
        const InsuranceFactory = await ethers.getContractFactory("InsurancePool");
        insurance = await InsuranceFactory.deploy(owner.address);
        await insurance.waitForDeployment();

        // 4. Deploy Escrow (Proxy)
        const EscrowFactory = await ethers.getContractFactory("FreelanceEscrow");
        escrow = await upgrades.deployProxy(EscrowFactory, [
            owner.address,
            ethers.ZeroAddress, // forwarder
            ethers.ZeroAddress, // ccipRouter
            await insurance.getAddress(),
            ethers.ZeroAddress  // lzEndpoint
        ], { kind: "uups" });
        await escrow.waitForDeployment();

        // 5. Setup Roles & Links
        await escrow.setPolyToken(await polyToken.getAddress());
        await escrow.setVault(vault.address);
        await polyToken.grantRole(await polyToken.MINTER_ROLE(), await escrow.getAddress());
        await escrow.setTokenWhitelist(await usdc.getAddress(), true);

        // 6. Fund accounts
        await usdc.mint(client.address, JOB_AMOUNT * 10n);
        await usdc.mint(freelancer.address, JOB_AMOUNT);
        await usdc.connect(client).approve(await escrow.getAddress(), ethers.MaxUint256);
        await usdc.connect(freelancer).approve(await escrow.getAddress(), ethers.MaxUint256);
    });

    describe("Full Job Lifecycle (ERC20)", function () {
        it("Processes a standard job from creation to completion", async function () {
            // Step 1: Create Job
            const tx1 = await escrow.connect(client).createJob(
                ethers.ZeroAddress,
                await usdc.getAddress(),
                JOB_AMOUNT,
                "ipfs://job-desc",
                7, // 7 days
                1 // Development
            );
            await expect(tx1).to.emit(escrow, "JobCreated");

            // Step 2: Freelancer Applies
            const applyStake = (JOB_AMOUNT * 5n) / 100n;
            await expect(escrow.connect(freelancer).applyForJob(1))
                .to.emit(escrow, "JobApplied")
                .withArgs(1, freelancer.address, applyStake);

            // Step 3: Client Picks Freelancer
            await expect(escrow.connect(client).pickFreelancer(1, freelancer.address))
                .to.emit(escrow, "FreelancerSelected");

            // Step 4: Accept Job (Locks 10% stake)
            // Note: Application stake (5%) is already in contract, acceptJob adds the rest
            // In current contract logic, acceptJob calculates full 10% and transfers it.
            // Let's verify freelancer balance
            const initialBalance = await usdc.balanceOf(freelancer.address);
            await escrow.connect(freelancer).acceptJob(1);
            const finalBalance = await usdc.balanceOf(freelancer.address);
            expect(initialBalance - finalBalance).to.equal((JOB_AMOUNT * 10n) / 100n);

            // Step 5: Submit Work
            await escrow.connect(freelancer).submitWork(1, "ipfs://work-results");

            // Step 6: Release Funds
            const initialFreelancerUSDC = await usdc.balanceOf(freelancer.address);
            const initialVaultUSDC = await usdc.balanceOf(vault.address);
            const initialInsuranceUSDC = await usdc.balanceOf(await insurance.getAddress());

            await expect(escrow.connect(client).releaseFunds(1))
                .to.emit(escrow, "FundsReleased");

            // Verify Payouts
            const platformFee = (JOB_AMOUNT * 250n) / 10000n; // 2.5%
            const insuranceFee = (JOB_AMOUNT * 100n) / 10000n; // 1%
            const freelancerNet = JOB_AMOUNT - platformFee - insuranceFee;
            const freelancerStake = (JOB_AMOUNT * 10n) / 100n;

            expect(await usdc.balanceOf(vault.address)).to.equal(initialVaultUSDC + platformFee);
            expect(await usdc.balanceOf(await insurance.getAddress())).to.equal(initialInsuranceUSDC + insuranceFee);
            expect(await usdc.balanceOf(freelancer.address)).to.equal(initialFreelancerUSDC + freelancerNet + freelancerStake);

            // Verify Rewards
            expect(await polyToken.balanceOf(freelancer.address)).to.equal(REWARD_AMOUNT);
            expect(await polyToken.balanceOf(client.address)).to.equal(REWARD_AMOUNT / 2n);
        });

        it("Fails when job deadline is passed and not started", async function () {
            await escrow.connect(client).createJob(
                freelancer.address,
                await usdc.getAddress(),
                JOB_AMOUNT,
                "ipfs://job",
                1, // 1 day
                1
            );

            await time.increase(2 * 24 * 60 * 60); // 2 days

            const initialClientUSDC = await usdc.balanceOf(client.address);
            await escrow.connect(client).refundExpiredJob(1);
            const finalClientUSDC = await usdc.balanceOf(client.address);

            expect(finalClientUSDC - initialClientUSDC).to.equal(JOB_AMOUNT);
        });
    });

    describe("Dispute & Arbitration", function () {
        it("Allows arbitrator to manually resolve a dispute with a split", async function () {
            await escrow.connect(client).createJob(
                freelancer.address,
                await usdc.getAddress(),
                JOB_AMOUNT,
                "ipfs://job",
                7,
                1
            );
            await escrow.connect(freelancer).acceptJob(1);
            await escrow.connect(freelancer).submitWork(1, "ipfs://work");

            // Trigger Dispute
            await escrow.connect(client).dispute(1);
            expect((await escrow.jobs(1)).status).to.equal(3); // Arbitration (in enum it's likely 4 if 0-based index)
            // Wait, checking JobStatus enum: Created(0), Accepted(1), Ongoing(2), Disputed(3), Arbitration(4)...
            // Actually it was updated to Created, Accepted, Ongoing, Disputed, Arbitration, Completed, Cancelled

            const totalEscrow = JOB_AMOUNT + (JOB_AMOUNT * 10n) / 100n;
            const freelancerShareBps = 7000; // 70%

            const initialFreelancerUSDC = await usdc.balanceOf(freelancer.address);
            const initialClientUSDC = await usdc.balanceOf(client.address);

            await escrow.connect(owner).resolveDisputeManual(1, freelancerShareBps);

            expect(await usdc.balanceOf(freelancer.address)).to.equal(initialFreelancerUSDC + (totalEscrow * 7n) / 10n);
            expect(await usdc.balanceOf(client.address)).to.equal(initialClientUSDC + (totalEscrow * 3n) / 10n);
        });
    });

    describe("Access Control & Security", function () {
        it("Prevents non-managers from pausing", async function () {
            await expect(escrow.connect(other).pause()).to.be.reverted;
        });

        it("Allows only arbitrator role to resolve manual disputes", async function () {
            await escrow.connect(client).createJob(freelancer.address, await usdc.getAddress(), JOB_AMOUNT, "test", 7, 1);
            await escrow.connect(freelancer).acceptJob(1);
            await escrow.connect(client).dispute(1);

            await expect(escrow.connect(other).resolveDisputeManual(1, 5000)).to.be.reverted;
        });

        it("Successfully upgrades the implementation via UUPS", async function () {
            const V2 = await ethers.getContractFactory("FreelanceEscrow");
            const upgraded = await upgrades.upgradeProxy(await escrow.getAddress(), V2);
            expect(await upgraded.getAddress()).to.equal(await escrow.getAddress());
        });
    });
});
