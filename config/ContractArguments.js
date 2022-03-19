const {utils} = require('ethers');
const CollectionConfig = require('./CollectionConfig');

module.exports = [
    CollectionConfig.tokenName,
    CollectionConfig.tokenSymbol,
    utils.parseEther(CollectionConfig.cost.toString()),
    CollectionConfig.maxSupply,
    CollectionConfig.maxMintAmount,
    CollectionConfig.maxMintAmountPerTx,
    CollectionConfig.baseURI,
    CollectionConfig.hiddenBaseURI
];
