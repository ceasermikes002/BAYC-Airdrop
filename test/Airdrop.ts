import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { Contract } from "ethers";
import { MerkleAirdrop } from "../typechain-types";

describe("BAYCAirdrop", () => {
  let airdrop: MerkleAirdrop;
  let token: Contract;
  let accounts: any[];
  let merkleTree: MerkleTree;
  let leafNodes: any[];
  let root: string;
  const claimAmounts = [100, 200, 300]; // Claimable amounts in tokens

  before(async () => {
    // Deploy ERC20Mock Token
    const Token:any = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Mock Token", "MTK", ethers.parseEther("10000"));
  
    // Wait for the contract to be deployed
    await token.waitForDeployment();
    
    console.log("Token deployed at:", token.target);
    expect(token.target).to.not.be.null; // Ensure token address is valid
  
    // Get test accounts
    accounts = await ethers.getSigners();
    const addresses = accounts
      .slice(0, claimAmounts.length)
      .map((account) => account.address);
  
    console.log("Accounts fetched:", addresses);
    addresses.forEach((addr: string) => expect(addr).to.not.be.null); // Ensure addresses are valid
  
    // Generate Merkle tree using addresses and claim amounts
    leafNodes = addresses.map((addr, i) =>
      ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [addr, ethers.parseEther(claimAmounts[i].toString())]
      )
    );
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    root = merkleTree.getHexRoot();
  
    console.log("Merkle root:", root);
    expect(root).to.not.be.null; // Ensure the root is generated
  
    // Deploying the MerkleAirdrop contract
    const MerkleAirdrop:any = await ethers.getContractFactory("MerkleAirdrop");
    airdrop = await MerkleAirdrop.deploy(
      token.target,  // Updated to reference the correct address property
      root,
      "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d" // BAYC address
    );
    
    // Wait for the contract to be deployed
    await airdrop.waitForDeployment();
  
    console.log("Airdrop contract deployed at:", airdrop.target);
    expect(airdrop.target).to.not.be.null; // Ensure airdrop address is valid
  
    // Fund the airdrop contract
    const tx = await token.transfer(airdrop.target, ethers.parseEther("600"));
    await tx.wait();
  
    const airdropBalance = await token.balanceOf(airdrop.target);
    console.log("Airdrop contract funded with:", ethers.formatEther(airdropBalance));
    expect(airdropBalance).to.equal(ethers.parseEther("600")); // Ensure airdrop is funded
  });
  
  // Utility function to get Merkle proof
  const getProof = (index: number) => {
    const proof = merkleTree.getHexProof(leafNodes[index]);
    console.log(`Merkle proof for index ${index}:`, proof);
    expect(proof).to.not.be.null;
    return proof;
  };

  
  it("should allow eligible users to claim their airdrop", async () => {
    const userIndex = 0;
    const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
    const proof = getProof(userIndex);

    await expect(
      airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof)
    )
      .to.emit(airdrop, "AirdropClaimed")
      .withArgs(accounts[userIndex].address, claimAmount);

    const userBalance = await token.balanceOf(accounts[userIndex].address);
    console.log(`User ${userIndex} balance:`, ethers.formatEther(userBalance));
    expect(userBalance).to.equal(claimAmount);
  });

  it("should reject claims with invalid proof", async () => {
    const userIndex = 0;
    const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
    const fakeProof = getProof(1); // Use a different account's proof

    await expect(
      airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, fakeProof)
    ).to.be.revertedWith("Invalid proof");
  });

  it("should reject claims for non-BAYC holders", async () => {
    const nonHolder = accounts[3]; // Simulate a non-BAYC holder
    const userIndex = 0;
    const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
    const proof = getProof(userIndex);

    await expect(
      airdrop.connect(nonHolder).claimAirdrop(claimAmount, proof)
    ).to.be.revertedWith("Not a BAYC holder");
  });

  it("should reject double claiming", async () => {
    const userIndex = 0;
    const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
    const proof = getProof(userIndex);

    // First claim should pass
    await expect(
      airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof)
    )
      .to.emit(airdrop, "AirdropClaimed")
      .withArgs(accounts[userIndex].address, claimAmount);

    // Second claim with the same proof should revert
    await expect(
      airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof)
    ).to.be.revertedWith("Airdrop already claimed");
  });

  it("should allow multiple eligible users to claim their airdrop", async () => {
    for (let i = 0; i < claimAmounts.length; i++) {
      const claimAmount = ethers.parseEther(claimAmounts[i].toString());
      const proof = getProof(i);

      await expect(
        airdrop.connect(accounts[i]).claimAirdrop(claimAmount, proof)
      )
        .to.emit(airdrop, "AirdropClaimed")
        .withArgs(accounts[i].address, claimAmount);

      const userBalance = await token.balanceOf(accounts[i].address);
      console.log(`User ${i} balance:`, ethers.formatEther(userBalance));
      expect(userBalance).to.equal(claimAmount);
    }
  });
});
