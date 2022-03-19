const whitelistAddresses = require('./whitelist.json');
require('dotenv').config();

module.exports = {
  tokenName: 'Toon Survival',
  tokenSymbol: 'TSV',
  baseURI: process.env.BASE_URL,
  hiddenBaseURI: process.env.HIDDEN_BASE_URL,
  cost: 0.1,
  maxSupply: 100,
  maxMintAmount: 5,
  maxMintAmountPerTx: 2,
  whitelistAddresses: whitelistAddresses,
};
