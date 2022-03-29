import { task, types } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';

export default task('new-ballot', 'Create new ballot')
  .addParam(
    'duration',
    'Ballot duration in seconds',
    '',
    types.int
  )
  .addParam(
    'name',
    'Ballot name',
    '',
    types.string
  )
  .addParam(
    'candidates',
    'List of addresses',
    '',
    types.string
  )
  .setAction(async ({ duration, name, candidates }, hre) => {
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

    const result = await contract.newBallot(
      duration,
      name.trim(),
      candidates.split(',')
    );

    console.log(result);
  });