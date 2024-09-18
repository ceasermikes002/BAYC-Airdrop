// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleAirdrop {
    address public immutable token;
    bytes32 public immutable merkleRoot;
    address public immutable BAYC;

    mapping(address => bool) public claimed;

    constructor(address _token, bytes32 _merkleRoot, address _BAYC) {
        token = _token;
        merkleRoot = _merkleRoot;
        BAYC = _BAYC;
    }

    function claimAirdrop(uint256 amount, bytes32[] calldata proof) external {
        require(!claimed[msg.sender], "Airdrop already claimed.");
        require(IERC721(BAYC).balanceOf(msg.sender) > 0, "Not a BAYC holder.");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid Merkle proof.");

        claimed[msg.sender] = true;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed.");
    }
}