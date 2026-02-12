const { ethers } = require("hardhat");

async function main() {
    try {
        console.log("Getting network...");
        const network = await ethers.provider.getNetwork();
        console.log("Network:", network.name, network.chainId);

        console.log("Getting signers...");
        const signers = await ethers.getSigners();
        console.log("Signers count:", signers.length);
        console.log("First signer:", signers[0].address);
    } catch (error) {
        console.error("Error detected:");
        console.error(error);
    }
}

main();
