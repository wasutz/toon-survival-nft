require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();

const mnemonic = process.env.MNEMONIC;
const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
const rinkebyNode = process.env.RINKEBY_NODE;
const mainnetNode = process.env.MAINNET_NODE;

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
    rinkeby: {
      url: rinkebyNode,
      accounts: [mnemonic]
    },
    mainnet: {
      url: mainnetNode,
      accounts: [mnemonic]
    }
  },
  etherscan: {
    apiKey: {
      rinkeby: etherscanApiKey,
      mainnet: etherscanApiKey,
    },
  }
};
