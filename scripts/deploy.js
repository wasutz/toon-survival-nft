const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const ToonSurvival = await hre.ethers.getContractFactory("ToonSurvival");

  const baseUri = process.env.BASE_URL;
  const hiddenUri = process.env.HIDDEN_BASE_URL;

  const toonSurvival = await ToonSurvival.deploy(baseUri, hiddenUri);

  await toonSurvival.deployed();

  console.log("ToonSurvival deployed to: ", toonSurvival.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
