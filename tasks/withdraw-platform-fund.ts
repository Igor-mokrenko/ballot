import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';

export default task('withdraw-platform-fund', 'Withdraw platform fund')
  .setAction(async (_, hre) => {
    if (!process.env.CONTRACT_ADDRESS) {
      console.error('CONTRACT_ADDRESS is required!');
      return;
    }

    const artifact = await hre.artifacts.readArtifact('CryptoBallot');
    const [owner] = await hre.ethers.getSigners();
    const contract = new hre.ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      artifact.abi,
      owner
    );

    const result = await contract.withdrawPlatformFund();

    console.log(result);
  });