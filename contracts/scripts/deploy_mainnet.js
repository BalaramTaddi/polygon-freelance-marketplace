const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const PolyToken = await hre.ethers.getContractFactory("PolyToken");
    const PolyTokenContract = await PolyToken.deploy();
    await PolyTokenContract.waitForDeployment();
    const polyTokenAddress = await PolyTokenContract.getAddress();
    console.log("PolyToken deployed to:", polyTokenAddress);

    const FreelanceEscrow = await hre.ethers.getContractFactory("FreelanceEscrow");
    // In production, we might want to initialize with specific parameters
    const FreelanceEscrowContract = await FreelanceEscrow.deploy();
    await FreelanceEscrowContract.waitForDeployment();
    const escrowAddress = await FreelanceEscrowContract.getAddress();
    console.log("FreelanceEscrow deployed to:", escrowAddress);

    console.log("\n--- Production Deployment Summary ---");
    console.log("Network: Polygon Mainnet");
    console.log("Token:", polyTokenAddress);
    console.log("Escrow:", escrowAddress);
    console.log("------------------------------------\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
