// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IBAYC {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract MerkleAirdrop {
    IERC20 public token;
    bytes32 public merkleRoot;
    address public baycAddress;

    // Mapping to keep track of claimed airdrops
    mapping(address => bool) public hasClaimed;

    event AirdropClaimed(address indexed claimant, uint256 amount);

    constructor(address _token, bytes32 _merkleRoot, address _baycAddress) {
        token = IERC20(_token);
        merkleRoot = _merkleRoot;
        baycAddress = _baycAddress;
    }

    /**
     * @notice Claim airdrop for eligible addresses.
     * @param amount The amount of tokens to claim.
     * @param merkleProof The Merkle proof to validate the claim.
     */
    function claimAirdrop(uint256 amount, bytes32[] calldata merkleProof) external {
        require(!hasClaimed[msg.sender], "Already claimed");

        // Verify Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");

        // Check if the user is a BAYC holder
        bool isBAYCHolder = checkBAYCHolder(msg.sender);
        require(isBAYCHolder, "Not a BAYC holder");

        // Mark the user as claimed
        hasClaimed[msg.sender] = true;

        // Transfer the tokens
        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit AirdropClaimed(msg.sender, amount);
    }

    /**
     * @notice Check if the caller is a BAYC holder.
     * @param account The address to check.
     * @return True if the account holds a BAYC NFT, false otherwise.
     */
    function checkBAYCHolder(address account) internal view returns (bool) {
        IBAYC bayc = IBAYC(baycAddress);
        for (uint256 i = 0; i < 10000; i++) {
            try bayc.ownerOf(i) returns (address owner) {
                if (owner == account) {
                    return true;
                }
            } catch {
                continue;
            }
        }
        return false;
    }
}
