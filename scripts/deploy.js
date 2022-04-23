const hre = require("hardhat");
const ContractArguments = require('../config/ContractArguments');

async function main() {
  console.log('Deploying contract...');

  const contractName = "ToonSurvival";
  const ToonSurvival = await hre.ethers.getContractFactory(contractName);
  const toonSurvival = await ToonSurvival.deploy(...ContractArguments);

  await toonSurvival.deployed();

  console.log(`${contractName} deployed to: ${toonSurvival.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
