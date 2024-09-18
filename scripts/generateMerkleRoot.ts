import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import fs from 'fs';
import path from 'path';

const csvFile:any = path.join(__dirname, '../data/bayc-holders.csv');

// Reading and parsing the CSV file
const holders = fs.readFileSync(csvFile, 'utf8').split('\n').slice(1).map(line => {
    const [rank, address, nametag, quantity, percentage] = line.split(',');
    return { address: address.replace(/"/g, '').trim(), amount: '1500' };
});

// Creating the Merkle tree
const leaves = holders.map(holder => keccak256(Buffer.from(`${holder.address}${holder.amount}`)));
const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot();

// For outputing the merkle root
console.log('Merkle Root:', root);

// Save the Merkle root and holder data to a JSON file
fs.writeFileSync('merkleRoot.json', JSON.stringify({ root, holders }, null, 2));

// Merkle Root: 0x301046edad1475754bf1a8c6d7ba8ce03be7ceea042b41dd714446bc84e33305
// Deployed ERC20 Adress:0x4B549c27cB853412a6474BA85352b5c777D0A228