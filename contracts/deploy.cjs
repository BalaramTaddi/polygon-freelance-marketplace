const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
        console.error("Please provide RPC_URL and PRIVATE_KEY in .env file");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Deploying contract with account:", wallet.address);

    const contractJson = JSON.parse(fs.readFileSync(path.join(__dirname, "FreelanceEscrow.json"), "utf8"));
    const { abi, bytecode } = contractJson;

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log("Preparing deployment transaction...");
    const contract = await factory.deploy();

    console.log("Waiting for deployment confirmation...");
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("FreelanceEscrow deployed to:", address);

    // Update the frontend contract address automatically
    const frontendConfigPath = path.resolve(__dirname, "..", "frontend", "src", "constants.js");
    const configContent = `export const CONTRACT_ADDRESS = "${address}";\n`;
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log("Updated frontend constants.js with new address.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
