const { ethers } = require("hardhat");
// const hre = require("hardhat");

async function main() {
  // this is the correct code. The code shown in the video is incorrect because it only works
  // with hardhat version 2.16.0 and toolbox version 3. In this tutorial we used 
  // hardhat version 2.14.0 and toolbox version 2
  
  const shelterContract = await ethers.getContractFactory("ShelterDB");
  const deployedContract = await shelterContract.deploy();
  await deployedContract.deployed();

  console.log("Contract deployed to:", deployedContract.address);
}

// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
