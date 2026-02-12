const { ethers, upgrades } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying Zenith Enhancement Contracts with:", deployer.address);

    // 1. Deploy YieldManager
    const YieldManager = await ethers.getContractFactory("YieldManager");
    // Mock addresses for Aave, Compound, Morpho for Amoy / Sepolia testing
    // In real deployment, we'd provide actual addresses
    const aavePool = "0x69AE2F624C486eFfBe6Ab96131f417407077E8b1"; // Mock
    const compoundPool = "0x69AE2F624C486eFfBe6Ab96131f417407077E8b2"; // Mock
    const morphoMarket = ethers.encodeBytes32String("mock-morpho");

    const yieldManager = await YieldManager.deploy(deployer.address);
    await yieldManager.waitForDeployment();
    const yieldManagerAddr = await yieldManager.getAddress();
    console.log("YieldManager deployed to:", yieldManagerAddr);

    // Configure Strategies
    // Strategy enum: NONE=0, AAVE=1, COMPOUND=2, MORPHO=3
    await yieldManager.setStrategy(1, aavePool, true); // AAVE
    await yieldManager.setStrategy(2, compoundPool, true); // COMPOUND
    // For Morpho, we would also set the market params if needed
    console.log("Strategies configured in YieldManager");

    // 2. Deploy SwapManager
    const SwapManager = await ethers.getContractFactory("SwapManager");
    const uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Polygon Mainnet V3 Router (use mock for Amoy)
    const swapManager = await SwapManager.deploy(uniswapRouter, deployer.address);
    await swapManager.waitForDeployment();
    console.log("SwapManager deployed to:", await swapManager.getAddress());

    // 3. Update FreelanceEscrow
    const LIB_ADDRESS = "0x..."; // Find existing lib address if needed
    const FreelanceEscrow = await ethers.getContractFactory("FreelanceEscrow");
    const escrowAddress = "0x25F6C8ed995C811E6c0ADb1D66A60830E8115e9A"; // Amoy Proxy
    const escrow = FreelanceEscrow.attach(escrowAddress);

    // Set new managers
    await escrow.setYieldManager(await yieldManager.getAddress());
    console.log("YieldManager set in Escrow");

    await escrow.setSwapManager(await swapManager.getAddress());
    console.log("SwapManager set in Escrow");

    // Whitelist USDT and PYUSD if addresses are available
    console.log("Zenith Enhancement Deployment Complete");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
