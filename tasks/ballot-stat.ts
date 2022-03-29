import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';

export default task('ballot-stat', 'Ballot statistics')
    .addParam(
        'ballotid',
        'Ballot id',
        '',
        types.int
    )
  .setAction(async ({ ballotid }, hre) => {
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

    const result = await contract.getBallotStat(ballotid);

    console.log(result);
  });