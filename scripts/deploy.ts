import { ethers } from 'hardhat';

async function main() {
  const CryptoBallot = await ethers.getContractFactory('CryptoBallot');
  const cryptoBallot = await CryptoBallot.deploy();
  await cryptoBallot.deployed();

  console.log('Contract address is:', cryptoBallot.address);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });