require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();

const keccak256 = require('keccak256');
const {MerkleTree} = require('merkletreejs');

const CollectionConfig = require('./config/CollectionConfig');
const mnemonic = process.env.MNEMONIC;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const goerliNode = process.env.GOERLI_NODE;
const mainnetNode = process.env.MAINNET_NODE;

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task('generate-root-hash', 'Generates root hash for the current whitelist', async () => {
  if (CollectionConfig.whitelistAddresses.length < 1) {
    throw 'The whitelist is empty, please add some addresses to the configuration.';
  }

  const leafNodes = CollectionConfig.whitelistAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
  const rootHash = '0x' + merkleTree.getRoot().toString('hex');

  console.log('The Merkle Tree root hash is: ' + rootHash);
});

task('generate-proof', 'Generates the whitelist proof for the given address', async (taskArgs) => {
  if (CollectionConfig.whitelistAddresses.length < 1) {
    throw 'The whitelist is empty, please add some addresses to the configuration.';
  }

  const leafNodes = CollectionConfig.whitelistAddresses.map(addr => keccak256(addr));
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
  const proof = merkleTree.getHexProof(keccak256(taskArgs.address)).toString();

  console.log('The whitelist proof is: ' + proof);
}).addPositionalParam('address', 'The given address');

module.exports = {
  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    goerli: {
      url: goerliNode,
      accounts: [mnemonic]
    },
    mainnet: {
      url: mainnetNode,
      accounts: [mnemonic]
    }
  },
  etherscan: {
    apiKey: {
      goerli: etherscanApiKey,
      mainnet: etherscanApiKey,
    },
  }
};
