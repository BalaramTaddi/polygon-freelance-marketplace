const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Deploying contracts with the account:", wallet.address);

    const polyTokenAbi = JSON.parse(fs.readFileSync("./artifacts/contracts/PolyToken.sol/PolyToken.json")).abi;
    const polyTokenBytecode = JSON.parse(fs.readFileSync("./artifacts/contracts/PolyToken.sol/PolyToken.json")).bytecode;

    const PolyTokenFactory = new ethers.ContractFactory(polyTokenAbi, polyTokenBytecode, wallet);
    console.log("Deploying PolyToken...");
    const polyToken = await PolyTokenFactory.deploy();
    await polyToken.waitForDeployment();
    const polyTokenAddress = await polyToken.getAddress();
    console.log("PolyToken deployed to:", polyTokenAddress);

    const escrowAbi = JSON.parse(fs.readFileSync("./artifacts/contracts/FreelanceEscrow.sol/FreelanceEscrow.json")).abi;
    const escrowBytecode = JSON.parse(fs.readFileSync("./artifacts/contracts/FreelanceEscrow.sol/FreelanceEscrow.json")).bytecode;

    const EscrowFactory = new ethers.ContractFactory(escrowAbi, escrowBytecode, wallet);
    console.log("Deploying FreelanceEscrow...");
    const escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("FreelanceEscrow deployed to:", escrowAddress);

    console.log("\n--- Production Deployment Summary ---");
    console.log("PolyToken:", polyTokenAddress);
    console.log("Escrow:", escrowAddress);
}

main().catch(console.error);
