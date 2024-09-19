import { expect, assert } from "chai";
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
        await token.deployed();

        // Get test accounts
        accounts = await ethers.getSigners();
        const addresses:any = accounts.slice(0, claimAmounts.length).map((account) => account.address);

        // To Generate Merkle tree using addresses and claim amounts
        leafNodes = addresses.map((addr:any, i:any) =>
            ethers.solidityPackedKeccak256(["address", "uint256"], [addr, ethers.parseEther(claimAmounts[i].toString())])
        );
        merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        root = merkleTree.getHexRoot();

        // Deploying the MerkleAirdrop contract 
        const MerkleAirdrop:any = await ethers.getContractFactory("MerkleAirdrop");
        airdrop = await MerkleAirdrop.deploy(token.address, root, "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"); // BAYC address
        await airdrop.deployed();

        // Fund the airdrop contract
        await token.transfer(airdrop.address, ethers.parseEther("600"));
    });

    // Utility function to get Merkle proof
    const getProof = (index: number) => merkleTree.getHexProof(leafNodes[index]);

    it("should allow eligible users to claim their airdrop", async () => {
        const userIndex = 0;
        const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
        const proof = getProof(userIndex);

        await expect(airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof))
            .to.emit(airdrop, "AirdropClaimed")
            .withArgs(accounts[userIndex].address, claimAmount);

        const userBalance = await token.balanceOf(accounts[userIndex].address);
        expect(userBalance).to.equal(claimAmount);
    });

    it("should reject claims with invalid proof", async () => {
        const userIndex = 0;
        const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
        const fakeProof = getProof(1); // Use a different account's proof

        await expect(airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, fakeProof))
            .to.be.revertedWith("Invalid proof");
    });

    it("should reject claims for non-BAYC holders", async () => {
        // Simulate an account that doesn't own BAYC
        const nonHolder = accounts[3];
        const userIndex = 0;
        const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
        const proof = getProof(userIndex);

        // We assume the claim function will check for BAYC ownership and revert if not found
        await expect(airdrop.connect(nonHolder).claimAirdrop(claimAmount, proof))
            .to.be.revertedWith("Not a BAYC holder");
    });

    it("should reject double claiming", async () => {
        const userIndex = 0;
        const claimAmount = ethers.parseEther(claimAmounts[userIndex].toString());
        const proof = getProof(userIndex);

        // First claim should pass
        await expect(airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof))
            .to.emit(airdrop, "AirdropClaimed")
            .withArgs(accounts[userIndex].address, claimAmount);

        // Second claim with the same proof should revert
        await expect(airdrop.connect(accounts[userIndex]).claimAirdrop(claimAmount, proof))
            .to.be.revertedWith("Airdrop already claimed");
    });

    it("should allow multiple eligible users to claim their airdrop", async () => {
        for (let i = 0; i < claimAmounts.length; i++) {
            const claimAmount = ethers.parseEther(claimAmounts[i].toString());
            const proof = getProof(i);

            await expect(airdrop.connect(accounts[i]).claimAirdrop(claimAmount, proof))
                .to.emit(airdrop, "AirdropClaimed")
                .withArgs(accounts[i].address, claimAmount);

            const userBalance = await token.balanceOf(accounts[i].address);
            expect(userBalance).to.equal(claimAmount);
        }
    });
});
