import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const deployMerkleAirdrop = async () => {
    // Load the merkle root data from JSON file
    const merkleDataPath = path.join(__dirname, '../merkleRoot.json');
    const merkleData = JSON.parse(fs.readFileSync(merkleDataPath, 'utf8'));

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const tokenAddress = '0x4B549c27cB853412a6474BA85352b5c777D0A228'; // Deployed ERC20 Token Address
    const BAYCAddress = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'; // BAYC NFT address

    // Get the Merkle Airdrop contract factory
    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");

    // Deploy the contract
    const merkleAirdrop:any = await MerkleAirdrop.deploy(tokenAddress, merkleData.root, BAYCAddress);
    
    await merkleAirdrop.deployed();

    console.log("Merkle Airdrop contract deployed at:", merkleAirdrop.address);
};

deployMerkleAirdrop().catch((error) => {
    console.error("Error deploying Merkle Airdrop:", error);
    process.exit(1);
});
